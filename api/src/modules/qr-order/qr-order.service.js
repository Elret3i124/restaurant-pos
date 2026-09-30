'use strict';

const crypto = require('node:crypto');
const { getClient } = require('../../lib/surreal-client');
const logger = require('../../lib/logger');
const { getCatalog, resolveCatalogLine } = require('./qr-order.catalog');
const { isValidTableSecret } = require('./qr-order.tables');

const asRows = (result, index = 0) => {
  const value = Array.isArray(result) ? result[index] : undefined;
  return Array.isArray(value) ? value : value ? [value] : [];
};

const firstCreated = (value) => (Array.isArray(value) ? value[0] : value);
const recordString = (value) => {
  const own = value?.toString?.();
  if (own && own !== '[object Object]') return own;
  if (value?.id != null) return recordString(value.id);
  return String(value || '');
};

function recordLiteral(value, expectedTable) {
  let text = recordString(value);
  if (/^[A-Za-z0-9_~-]+$/.test(text)) text = `${expectedTable}:${text}`;
  const pattern = new RegExp(`^${expectedTable}:[A-Za-z0-9_~-]+$`);
  if (!pattern.test(text)) throw new Error(`Invalid ${expectedTable} record id`);
  return text;
}

async function deleteRecord(db, value, expectedTable) {
  const literal = recordLiteral(value, expectedTable);
  await db.query(`DELETE ${literal}`);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertTableAccess(tableNumber, qrSecret) {
  const parsed = Number(tableNumber);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20 || !isValidTableSecret(parsed, qrSecret)) {
    throw httpError(403, 'Invalid table QR code');
  }
  return parsed;
}

function validateOrderInput(payload) {
  const tableNumber = assertTableAccess(payload?.tableNumber, payload?.qrSecret);
  const customerName = String(payload?.customerName || '').trim();
  if (!customerName || customerName.length > 80) {
    throw httpError(422, 'Customer name is required and must be 80 characters or fewer');
  }
  if (!Array.isArray(payload?.items) || payload.items.length < 1 || payload.items.length > 50) {
    throw httpError(422, 'Order must contain between 1 and 50 items');
  }

  const lines = payload.items.map((candidate, index) => {
    const resolved = resolveCatalogLine(candidate?.menuItemId, candidate?.variantId);
    if (!resolved) {
      throw httpError(422, `Invalid or unavailable menu item at position ${index + 1}`);
    }
    const quantity = Number(candidate?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw httpError(422, `Quantity at position ${index + 1} must be between 1 and 20`);
    }
    const note = candidate?.note == null ? '' : String(candidate.note).trim();
    if (note.length > 240) {
      throw httpError(422, `Note at position ${index + 1} must be 240 characters or fewer`);
    }
    if (Array.isArray(candidate?.extraIds) && candidate.extraIds.length > 0) {
      throw httpError(422, 'This menu does not currently offer supplements');
    }
    return { ...resolved, quantity, note };
  });

  return { tableNumber, customerName, lines };
}

function localDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Africa/Casablanca',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

function extractCounter(result) {
  let last = null;
  const visit = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) last = Math.floor(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if ('value' in value) visit(value.value);
      else Object.values(value).forEach(visit);
    }
  };
  visit(result);
  return last;
}

async function allocateCounter(db, key, seedQuery) {
  const maxResult = await db.query(seedQuery);
  const seed = Number(asRows(maxResult)?.[0]?.max_value || 0);
  const result = await db.query(
    `UPSERT type::record('order_number_seq', $key)
     SET value = math::max([value ?? 0, $seed]) + 1
     RETURN AFTER`,
    { key, seed: Number.isFinite(seed) ? Math.floor(seed) : 0 },
  );
  const value = extractCounter(result);
  if (!value || value < 1) throw new Error(`Could not allocate order counter ${key}`);
  return value;
}

async function lookupContext(db, tableNumber) {
  // Keep these sequential: some Surreal websocket engines serialize query frames.
  const tableResult = await db.query(
      `SELECT * FROM floor_table
       WHERE number = $number AND deleted_at = none
       FETCH floor`,
      { number: String(tableNumber) },
    );
  const orderTypeResult = await db.query(`SELECT * FROM order_type WHERE string::lowercase(name) = 'dine in' AND deleted_at = none LIMIT 1`);
  const userResult = await db.query(`SELECT * FROM user WHERE login = '5555' AND deleted_at = none LIMIT 1`);
  const kitchenResult = await db.query(`SELECT * FROM kitchen WHERE deleted_at = none ORDER BY name LIMIT 1`);

  const table = asRows(tableResult).find((candidate) => candidate?.floor?.name === 'Ground')
    || asRows(tableResult)[0];
  const orderType = asRows(orderTypeResult)[0];
  const user = asRows(userResult)[0] || null;
  const kitchen = asRows(kitchenResult)[0] || null;
  if (!table) throw httpError(422, `POS table ${tableNumber} was not found`);
  if (!orderType) throw httpError(422, 'Dine In order type was not found');
  return { table, floor: table.floor, orderType, user, kitchen };
}

function persistedMenuItemKey(product, selectedVariant) {
  return `qr_${crypto.createHash('sha256').update(`${product.id}:${selectedVariant.id}`).digest('hex').slice(0, 20)}`;
}

async function ensureMenuItem(db, product, selectedVariant) {
  const key = persistedMenuItemKey(product, selectedVariant);
  const result = await db.query(
    `UPSERT type::record('menu_item', $key) SET
       name = $name,
       number = $number,
       price = $price,
       priority = 999,
       categories = [],
       created_at = time::now()
     RETURN AFTER`,
    {
      key,
      name: `${product.name} (${selectedVariant.name})`,
      number: `QR-${key.slice(-8).toUpperCase()}`,
      price: Number(selectedVariant.price),
    },
  );
  const row = asRows(result).find((candidate) => candidate?.id) || firstCreated(result?.[0]);
  if (!row?.id) throw new Error(`Could not prepare menu item ${product.name}`);
  return row;
}

function publicLine(line, index) {
  const unitPrice = Number(line.variant.price);
  return {
    id: `${line.product.id}:${line.variant.id}:${index}`,
    itemName: line.product.name,
    variantName: line.variant.name,
    quantity: line.quantity,
    unitPrice,
    lineTotal: unitPrice * line.quantity,
    extras: [],
    note: line.note || null,
  };
}

async function findIdempotentOrder(db, tableNumber, idempotencyKey) {
  if (!idempotencyKey) return null;
  const result = await db.query(
    `SELECT * FROM qr_order
     WHERE table_number = $tableNumber AND idempotency_key = $idempotencyKey
     LIMIT 1`,
    { tableNumber, idempotencyKey },
  );
  return asRows(result)[0] || null;
}

function createResponse(qrOrder) {
  return {
    publicToken: qrOrder.public_token,
    dailyNumber: qrOrder.daily_number,
    tableNumber: qrOrder.table_number,
    status: qrOrder.status,
  };
}

async function createOrder(payload, idempotencyKey) {
  const validated = validateOrderInput(payload);
  const normalizedIdempotencyKey = String(idempotencyKey || '').trim().slice(0, 100) || null;
  const db = await getClient();
  const existing = await findIdempotentOrder(db, validated.tableNumber, normalizedIdempotencyKey);
  if (existing) return createResponse(existing);

  const context = await lookupContext(db, validated.tableNumber);
  logger.info('qr-order', 'Validated incoming QR order', { tableNumber: validated.tableNumber, itemCount: validated.lines.length });
  const now = new Date();
  const createdItems = [];
  let createdOrder = null;

  try {
    const publicItems = [];
    for (let index = 0; index < validated.lines.length; index += 1) {
      const line = validated.lines[index];
      const menuItem = await ensureMenuItem(db, line.product, line.variant);
      logger.info('qr-order', 'Prepared QR menu item', { menuItemId: recordString(menuItem.id) });
      const menuItemRef = recordLiteral(menuItem.id, 'menu_item');
      const createdBy = context.user?.id ? recordLiteral(context.user.id, 'user') : 'NONE';
      const itemResult = await db.query(
        `CREATE order_item SET
           item = ${menuItemRef},
           price = $price,
           quantity = $quantity,
           position = $position,
           comments = $comments,
           service_charges = 0,
           discount = 0,
           modifiers = [],
           is_suspended = false,
           level = 1,
           category = $category,
           category_id = NONE,
           is_addition = false,
           menu = 'QR Menu',
           tax = 0,
           tax_mode = 'exclusive',
           created_at = time::now(),
           created_by = ${createdBy}
         RETURN AFTER`,
        {
          price: Number(line.variant.price),
          quantity: line.quantity,
          position: index,
          comments: line.note || '',
          category: line.product.category,
        },
      );
      const createdItem = asRows(itemResult)[0];
      if (!createdItem?.id) throw new Error(`Could not create order item ${line.product.name}`);
      logger.info('qr-order', 'Created QR line item', { orderItemId: recordString(createdItem.id) });
      createdItems.push(createdItem);
      publicItems.push(publicLine(line, index));
    }
    logger.info('qr-order', 'Created QR order items', { count: createdItems.length });

    const invoiceNumber = await allocateCounter(
      db,
      `invoice_${localDayKey(now)}`,
      'SELECT math::max(invoice_number) AS max_value FROM order WHERE created_at >= time::floor(time::now(), 1d) GROUP ALL',
    );
    const autoId = await allocateCounter(
      db,
      'auto_id',
      'SELECT math::max(auto_id) AS max_value FROM order GROUP ALL',
    );
    logger.info('qr-order', 'Allocated QR order numbers', { invoiceNumber, autoId });

    const floorRef = recordLiteral(context.floor.id, 'floor');
    const orderTypeRef = recordLiteral(context.orderType.id, 'order_type');
    const tableRef = recordLiteral(context.table.id, 'floor_table');
    const userRef = context.user?.id ? recordLiteral(context.user.id, 'user') : 'NONE';
    const itemRefs = createdItems.map((candidate) => recordLiteral(candidate.id, 'order_item')).join(', ');
    const orderResult = await db.query(
      `CREATE order SET
         floor = ${floorRef},
         covers = 1,
         tax = NONE,
         tax_amount = 0,
         tags = ['Normal', 'QR'],
         discount = NONE,
         discount_amount = 0,
         customer = NONE,
         order_type = ${orderTypeRef},
         status = 'In Progress',
         invoice_number = $invoiceNumber,
         auto_id = $autoId,
         items = [${itemRefs}],
         \`table\` = ${tableRef},
         user = ${userRef},
         service_charge = 0,
         service_charge_amount = 0,
         service_charge_type = 'percent',
         notes = $notes,
         created_at = time::now()
       RETURN AFTER`,
      { invoiceNumber, autoId, notes: `QR order - ${validated.customerName}` },
    );
    createdOrder = asRows(orderResult)[0];
    if (!createdOrder?.id) throw new Error('Could not create POS order');
    logger.info('qr-order', 'Created local POS order', { orderId: recordString(createdOrder.id), tableNumber: validated.tableNumber });

    for (const createdItem of createdItems) {
      const orderRef = recordLiteral(createdOrder.id, 'order');
      const orderItemRef = recordLiteral(createdItem.id, 'order_item');
      await db.query(`UPDATE ${orderItemRef} SET order = ${orderRef}`);
      if (context.kitchen?.id) {
        const kitchenRef = recordLiteral(context.kitchen.id, 'kitchen');
        await db.query(
          `CREATE order_item_kitchen SET
             kitchen = ${kitchenRef},
             order_item = ${orderItemRef},
             status = 'pending',
             sequence = 0,
             is_terminal = true,
             activated_at = time::now(),
             created_at = time::now(),
             completed_by = []`,
        );
      }
    }

    const total = publicItems.reduce((sum, line) => sum + line.lineTotal, 0);
    const publicToken = crypto.randomBytes(24).toString('hex');
    const localOrderRef = recordLiteral(createdOrder.id, 'order');
    const qrOrderResult = await db.query(
      `CREATE qr_order SET
         public_token = $publicToken,
         local_order = ${localOrderRef},
         idempotency_key = $idempotencyKey,
         customer_name = $customerName,
         table_number = $tableNumber,
         daily_number = $dailyNumber,
         items = $items,
         total = $total,
         status = 'WAITING_PAYMENT',
         created_at = time::now()
       RETURN AFTER`,
      {
        publicToken,
        idempotencyKey: normalizedIdempotencyKey,
        customerName: validated.customerName,
        tableNumber: validated.tableNumber,
        dailyNumber: invoiceNumber,
        items: publicItems,
        total,
      },
    );
    const qrOrder = asRows(qrOrderResult)[0];
    if (!qrOrder?.id) throw new Error('Could not create QR order receipt');
    logger.info('qr-order', 'Created QR order receipt', { orderId: recordString(createdOrder.id), dailyNumber: invoiceNumber });
    return createResponse(qrOrder);
  } catch (error) {
    // Best-effort rollback only for records created by this request.
    if (createdOrder?.id) await deleteRecord(db, createdOrder.id, 'order').catch(() => {});
    for (const createdItem of createdItems) {
      await deleteRecord(db, createdItem.id, 'order_item').catch(() => {});
    }
    throw error;
  }
}

async function getQrOrderByToken(db, publicToken) {
  if (!/^[a-f0-9]{48}$/i.test(String(publicToken || ''))) {
    throw httpError(404, 'Order not found');
  }
  const result = await db.query(
    `SELECT * FROM qr_order WHERE public_token = $publicToken LIMIT 1 FETCH local_order`,
    { publicToken: String(publicToken) },
  );
  const qrOrder = asRows(result)[0];
  if (!qrOrder) throw httpError(404, 'Order not found');
  return qrOrder;
}

function resolvePublicStatus(qrOrder) {
  if (qrOrder.status === 'CANCELLED' || qrOrder.local_order?.status === 'Cancelled') return 'CANCELLED';
  if (qrOrder.local_order?.status === 'Paid') return 'PAID';
  return qrOrder.status || 'WAITING_PAYMENT';
}

async function getPublicOrder(publicToken) {
  const db = await getClient();
  const qrOrder = await getQrOrderByToken(db, publicToken);
  return {
    publicToken: qrOrder.public_token,
    dailyNumber: qrOrder.daily_number,
    tableNumber: qrOrder.table_number,
    customerName: qrOrder.customer_name,
    status: resolvePublicStatus(qrOrder),
    items: qrOrder.items || [],
    total: Number(qrOrder.total || 0),
    createdAt: qrOrder.created_at,
  };
}

async function cancelPublicOrder(publicToken) {
  const db = await getClient();
  const qrOrder = await getQrOrderByToken(db, publicToken);
  const status = resolvePublicStatus(qrOrder);
  if (status !== 'WAITING_PAYMENT') {
    throw httpError(409, 'Only an unpaid order can be cancelled');
  }
  const orderRef = recordLiteral(qrOrder.local_order.id, 'order');
  const itemRefs = (qrOrder.local_order.items || []).map((item) => recordLiteral(item, 'order_item'));
  await db.query(`UPDATE ${orderRef} SET status = 'Cancelled', updated_at = time::now()`);
  if (itemRefs.length > 0) {
    await db.query(
      `UPDATE order_item_kitchen
       SET status = 'cancelled', completed_at = time::now()
       WHERE order_item IN [${itemRefs.join(', ')}]`,
    );
  }
  const qrOrderRef = recordLiteral(qrOrder.id, 'qr_order');
  await db.query(`UPDATE ${qrOrderRef} SET status = 'CANCELLED', cancelled_at = time::now()`);
  return getPublicOrder(publicToken);
}

module.exports = {
  assertTableAccess,
  createOrder,
  getCatalog,
  getPublicOrder,
  cancelPublicOrder,
  validateOrderInput,
};
