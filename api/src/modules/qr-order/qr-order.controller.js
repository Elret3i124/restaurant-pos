'use strict';

const service = require('./qr-order.service');

async function getMenu(req, res, next) {
  try {
    res.json(service.getCatalog());
  } catch (error) {
    next(error);
  }
}

async function validateTable(req, res, next) {
  try {
    const tableNumber = service.assertTableAccess(req.query.table, req.query.qr);
    res.json({ valid: true, tableNumber });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.requestId;
    const result = await service.createOrder(req.body, idempotencyKey);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getPublicOrder(req, res, next) {
  try {
    res.json(await service.getPublicOrder(req.params.publicToken));
  } catch (error) {
    next(error);
  }
}

async function cancelPublicOrder(req, res, next) {
  try {
    res.json(await service.cancelPublicOrder(req.params.publicToken));
  } catch (error) {
    next(error);
  }
}

module.exports = { getMenu, validateTable, createOrder, getPublicOrder, cancelPublicOrder };
