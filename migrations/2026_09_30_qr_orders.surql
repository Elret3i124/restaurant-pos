-- Public QR menu orders mapped to local POS orders.
-- Table QR secrets stay in the API process; they are never persisted here.

DEFINE TABLE IF NOT EXISTS qr_order TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;

DEFINE FIELD IF NOT EXISTS public_token ON qr_order TYPE string PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS local_order ON qr_order TYPE record<order> PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS idempotency_key ON qr_order TYPE none | string | null PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS customer_name ON qr_order TYPE string PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS table_number ON qr_order TYPE int PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS daily_number ON qr_order TYPE int PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS items ON qr_order TYPE any PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS total ON qr_order TYPE float PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS status ON qr_order TYPE string PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS created_at ON qr_order TYPE datetime DEFAULT time::now() PERMISSIONS FULL;
DEFINE FIELD IF NOT EXISTS cancelled_at ON qr_order TYPE none | datetime | null PERMISSIONS FULL;

DEFINE INDEX IF NOT EXISTS qr_order_public_token ON qr_order FIELDS public_token UNIQUE;
DEFINE INDEX IF NOT EXISTS qr_order_local_order ON qr_order FIELDS local_order;
DEFINE INDEX IF NOT EXISTS qr_order_table_created ON qr_order FIELDS table_number, created_at;
