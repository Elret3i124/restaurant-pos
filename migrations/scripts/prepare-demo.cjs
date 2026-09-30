'use strict';

/**
 * Make the bundled database useful as a local product demo.
 *
 * - Grants the current, complete permission catalog to the seeded Master role.
 * - Applies the idempotent starter-data migration.
 * - Prints a compact verification summary.
 *
 * Run `npm run demo:prepare` after importing latest.surql + demo-data.surql.
 */

const fs = require('node:fs');
const path = require('node:path');
const WS = require('ws');
const { Surreal, StringRecordId } = require('surrealdb');

if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = WS;
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DB_URL = process.env.SURREAL_URL || 'ws://localhost:8000/rpc';
const DB_NS = process.env.SURREAL_NS || 'posr';
const DB_NAME = process.env.SURREAL_DB || 'posr';
const DB_USER = process.env.SURREAL_USER || 'root';
const DB_PASS = process.env.SURREAL_PASS || 'root';

const rows = (result, index = 0) => {
  const value = Array.isArray(result) ? result[index] : undefined;
  return Array.isArray(value) ? value : [];
};

function readPermissionCatalog() {
  const filename = path.join(PROJECT_ROOT, 'src', 'lib', 'access.rules.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const boundary = source.indexOf('/** Old English permission strings');
  if (boundary < 0) {
    throw new Error(`Could not locate permission catalog boundary in ${filename}`);
  }

  const catalogSource = source.slice(0, boundary);
  const ids = [...catalogSource.matchAll(/"([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*)"/g)]
    .map((match) => match[1]);
  return [...new Set(ids)].sort();
}

async function main() {
  const permissions = readPermissionCatalog();
  const seedFile = path.join(PROJECT_ROOT, 'migrations', '2026_09_05_demo_readiness.surql');
  const seedSql = fs.readFileSync(seedFile, 'utf8');

  const db = new Surreal();
  await db.connect(DB_URL);
  await db.signin({ username: DB_USER, password: DB_PASS });
  await db.use({ namespace: DB_NS, database: DB_NAME });

  const masters = rows(await db.query("SELECT id FROM user_role WHERE name = 'Master' LIMIT 1"));
  if (masters.length !== 1) {
    throw new Error('The seeded Master role was not found. Import migrations/demo-data.surql first.');
  }

  const masterId = masters[0].id.toString();
  await db.query('UPDATE $id SET roles = $roles', {
    id: new StringRecordId(masterId),
    roles: permissions,
  });
  await db.query(seedSql);

  const verification = await db.query(`
    SELECT count() AS count FROM customer GROUP ALL;
    SELECT count() AS count FROM inventory_item GROUP ALL;
    SELECT count() AS count FROM inventory_location GROUP ALL;
    SELECT count() AS count FROM employee GROUP ALL;
    SELECT count() AS count FROM time_entry GROUP ALL;
    SELECT count() AS count FROM account GROUP ALL;
    SELECT count() AS count FROM order GROUP ALL;
    SELECT array::len(roles) AS count FROM ONLY ${masterId};
  `);

  const labels = [
    'customers', 'inventory items', 'inventory locations', 'employees',
    'time entries', 'accounts', 'orders', 'Master permissions',
  ];
  const counts = Object.fromEntries(labels.map((label, index) => {
    const record = rows(verification, index)[0] || verification[index];
    return [label, Number(record?.count || 0)];
  }));

  console.log(`Prepared ${DB_NS}/${DB_NAME} at ${DB_URL}`);
  console.log(JSON.stringify(counts, null, 2));
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
