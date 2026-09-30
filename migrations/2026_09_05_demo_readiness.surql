-- Practical, idempotent starter data for the bundled local demo.
--
-- This deliberately fills master/configuration tables and a small amount of
-- recent operational history. It does not pretend that external payment,
-- accounting, delivery, or AI providers are configured.

BEGIN TRANSACTION;

-- The print settings in demo-data.surql already reference this record.
UPSERT printer:nhalv9ihmmaw918dvari SET
  name = 'Demo Receipt Printer',
  type = 'network',
  ip_address = '127.0.0.1',
  port = 9100,
  prints = 1,
  priority = 1;

-- Customers and promotions.
UPSERT customer:demo_alex SET
  name = 'Alex Morgan', phone = '+1 555 0101', email = 'alex@example.test',
  address = '12 Market Street', points = 120f, tags = ['regular', 'demo'];
UPSERT customer:demo_samira SET
  name = 'Samira Khan', phone = '+1 555 0102', email = 'samira@example.test',
  address = '48 Garden Avenue', points = 60f, tags = ['delivery', 'demo'];
UPSERT customer:demo_corporate SET
  name = 'Northwind Office', phone = '+1 555 0103', email = 'orders@northwind.example',
  address = '200 Business Park', points = 300f, tags = ['corporate', 'demo'];

UPSERT coupon:demo_welcome10 SET
  code = 'WELCOME10', coupon_type = 'order', description = '10% off a demo order',
  discount_type = 'percent', discount_value = 10f, first_order_only = false,
  is_active = true, max_discount_amount = 500f, min_order_amount = 500f,
  priority = 10, stackable = false, usage_limit = 1000,
  usage_limit_per_user = 1, used_count = 0;
UPSERT coupon:demo_lunch200 SET
  code = 'LUNCH200', coupon_type = 'order', description = 'Fixed lunch discount',
  discount_type = 'fixed', discount_value = 200f, first_order_only = false,
  is_active = true, max_discount_amount = 200f, min_order_amount = 1500f,
  priority = 5, stackable = false, usage_limit = 1000,
  usage_limit_per_user = 5, used_count = 0;

-- Inventory catalogue, locations, suppliers, and opening stock.
UPSERT inventory_store:demo_main SET name = 'Main Store';
UPSERT inventory_store:demo_kitchen SET name = 'Kitchen Store';
UPSERT inventory_location:demo_main SET
  name = 'Main Stockroom', type = 'store', linked_store = inventory_store:demo_main,
  is_active = true;
UPSERT inventory_location:demo_kitchen SET
  name = 'Kitchen Pantry', type = 'kitchen', linked_store = inventory_store:demo_kitchen,
  linked_kitchen = kitchen:n2xrcspsjhuq7lc24b6l, is_active = true;

UPSERT inventory_category:demo_food SET name = 'Food Ingredients', priority = 1;
UPSERT inventory_category:demo_beverage SET name = 'Beverages', priority = 2;
UPSERT inventory_category:demo_packaging SET name = 'Packaging', priority = 3;

UPSERT inventory_supplier:demo_fresh SET
  name = 'Fresh Foods Supply', phone = '+1 555 0201',
  email = 'sales@freshfoods.example', address = 'Wholesale Market';
UPSERT inventory_supplier:demo_drinks SET
  name = 'City Beverage Co.', phone = '+1 555 0202',
  email = 'orders@citybeverage.example', address = 'Industrial District';

UPSERT inventory_item:demo_flour SET
  name = 'Pizza Flour', code = 'ING-FLOUR', category = inventory_category:demo_food,
  item_types = ['raw'], uom = 'kg', average_price = 180f, price = 180f,
  base_quantity = 1f, taxable = false, suppliers = [inventory_supplier:demo_fresh],
  stores = [inventory_store:demo_main, inventory_store:demo_kitchen],
  locations = [inventory_location:demo_main, inventory_location:demo_kitchen],
  reorder_levels = { demo_main: 20, demo_kitchen: 5 };
UPSERT inventory_item:demo_cheese SET
  name = 'Mozzarella Cheese', code = 'ING-CHEESE', category = inventory_category:demo_food,
  item_types = ['raw'], uom = 'kg', average_price = 950f, price = 950f,
  base_quantity = 1f, taxable = false, suppliers = [inventory_supplier:demo_fresh],
  stores = [inventory_store:demo_main, inventory_store:demo_kitchen],
  locations = [inventory_location:demo_main, inventory_location:demo_kitchen],
  reorder_levels = { demo_main: 10, demo_kitchen: 3 };
UPSERT inventory_item:demo_chicken SET
  name = 'Chicken Breast', code = 'ING-CHICKEN', category = inventory_category:demo_food,
  item_types = ['raw'], uom = 'kg', average_price = 720f, price = 720f,
  base_quantity = 1f, taxable = false, suppliers = [inventory_supplier:demo_fresh],
  stores = [inventory_store:demo_main, inventory_store:demo_kitchen],
  locations = [inventory_location:demo_main, inventory_location:demo_kitchen],
  reorder_levels = { demo_main: 12, demo_kitchen: 4 };
UPSERT inventory_item:demo_cola SET
  name = 'Cola 330ml', code = 'BEV-COLA', category = inventory_category:demo_beverage,
  item_types = ['resale'], uom = 'bottle', average_price = 80f, price = 150f,
  base_quantity = 1f, taxable = true, suppliers = [inventory_supplier:demo_drinks],
  stores = [inventory_store:demo_main], locations = [inventory_location:demo_main],
  reorder_levels = { demo_main: 48 };
UPSERT inventory_item:demo_box SET
  name = 'Large Pizza Box', code = 'PKG-LBOX', category = inventory_category:demo_packaging,
  item_types = ['raw'], uom = 'piece', average_price = 35f, price = 35f,
  base_quantity = 1f, taxable = false, suppliers = [inventory_supplier:demo_fresh],
  stores = [inventory_store:demo_main], locations = [inventory_location:demo_main],
  reorder_levels = { demo_main: 100 };

UPSERT inventory_ledger:demo_open_flour SET
  business_date = time::format(time::now(), '%Y-%m-%d'),
  inventory_item = inventory_item:demo_flour, inventory_location = inventory_location:demo_main,
  ledger_key = 'demo:opening:flour:main', reference_type = 'opening_balance',
  reference_id = 'demo-opening', quantity_change = 75f, unit_cost = 180f,
  total_cost = 13500f, notes = 'Demo opening stock', created_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT inventory_ledger:demo_open_cheese SET
  business_date = time::format(time::now(), '%Y-%m-%d'),
  inventory_item = inventory_item:demo_cheese, inventory_location = inventory_location:demo_main,
  ledger_key = 'demo:opening:cheese:main', reference_type = 'opening_balance',
  reference_id = 'demo-opening', quantity_change = 30f, unit_cost = 950f,
  total_cost = 28500f, notes = 'Demo opening stock', created_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT inventory_ledger:demo_open_chicken SET
  business_date = time::format(time::now(), '%Y-%m-%d'),
  inventory_item = inventory_item:demo_chicken, inventory_location = inventory_location:demo_main,
  ledger_key = 'demo:opening:chicken:main', reference_type = 'opening_balance',
  reference_id = 'demo-opening', quantity_change = 24f, unit_cost = 720f,
  total_cost = 17280f, notes = 'Demo opening stock', created_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT inventory_ledger:demo_open_cola SET
  business_date = time::format(time::now(), '%Y-%m-%d'),
  inventory_item = inventory_item:demo_cola, inventory_location = inventory_location:demo_main,
  ledger_key = 'demo:opening:cola:main', reference_type = 'opening_balance',
  reference_id = 'demo-opening', quantity_change = 120f, unit_cost = 80f,
  total_cost = 9600f, notes = 'Demo opening stock', created_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT inventory_ledger:demo_open_box SET
  business_date = time::format(time::now(), '%Y-%m-%d'),
  inventory_item = inventory_item:demo_box, inventory_location = inventory_location:demo_main,
  ledger_key = 'demo:opening:box:main', reference_type = 'opening_balance',
  reference_id = 'demo-opening', quantity_change = 200f, unit_cost = 35f,
  total_cost = 7000f, notes = 'Demo opening stock', created_by = user:ldor4zsa96nmrnrc2n8o;

-- A small production recipe makes the production screens usable immediately.
UPSERT recipe:demo_pizza_dough SET
  name = 'Pizza Dough Batch', code = 'REC-DOUGH', base_batch_qty = 10f,
  cost_allocation = 'yield', created_by = user:ldor4zsa96nmrnrc2n8o,
  is_active = true, notes = 'Starter recipe for the local demo';
UPSERT recipe_item:demo_dough_flour SET
  recipe = recipe:demo_pizza_dough, item = inventory_item:demo_flour,
  quantity = 5f, sort_order = 1;
UPSERT recipe_output:demo_dough_output SET
  recipe = recipe:demo_pizza_dough, item = inventory_item:demo_flour,
  yield_percent = 100f, value_weight = 1f, disposition = 'inventory',
  is_primary = true, sort_order = 1;
UPDATE recipe:demo_pizza_dough SET primary_output = recipe_output:demo_dough_output;

-- HR master data and recent attendance.
UPSERT department:demo_operations SET
  code = 'OPS', name = 'Operations', description = 'Restaurant operations', is_active = true;
UPSERT department:demo_kitchen SET
  code = 'KIT', name = 'Kitchen', description = 'Kitchen and food production', is_active = true;
UPSERT cost_center:demo_front SET
  code = 'FOH', name = 'Front of House', description = 'Dining and counter service', is_active = true;
UPSERT cost_center:demo_back SET
  code = 'BOH', name = 'Back of House', description = 'Kitchen operations', is_active = true;
UPSERT position:demo_manager SET
  code = 'MGR', name = 'Restaurant Manager', department = department:demo_operations,
  default_cost_center = cost_center:demo_front, is_active = true;
UPSERT position:demo_cashier SET
  code = 'CSH', name = 'Cashier', department = department:demo_operations,
  default_cost_center = cost_center:demo_front, is_active = true;
UPSERT position:demo_cook SET
  code = 'COOK', name = 'Line Cook', department = department:demo_kitchen,
  default_cost_center = cost_center:demo_back, is_active = true;

UPDATE employee SET
  department = department:demo_operations,
  position = position:demo_manager,
  cost_center = cost_center:demo_front
WHERE user = user:ldor4zsa96nmrnrc2n8o;
UPSERT employee:demo_cashier SET
  employee_number = 'DEMO-1002', first_name = 'Cashier', last_name = 'One',
  employment_status = 'active', employment_type = 'hourly', hire_date = time::now() - 120d,
  department = department:demo_operations, position = position:demo_cashier,
  cost_center = cost_center:demo_front, user = user:gshwt74pxo5kmnim6ppd;
UPSERT employee:demo_cook SET
  employee_number = 'DEMO-1003', first_name = 'Ahmed', last_name = 'Ali',
  employment_status = 'active', employment_type = 'hourly', hire_date = time::now() - 90d,
  department = department:demo_kitchen, position = position:demo_cook,
  cost_center = cost_center:demo_back, user = user:xctfnhj7nv11jvwl2i3n;

UPSERT employee_pay_profile:demo_cashier SET
  employee = employee:demo_cashier, pay_type = 'hourly', base_rate = 18f,
  currency = 'USD', effective_from = time::now() - 120d,
  maximum_hours_per_day = 8f, maximum_hours_per_week = 40f,
  expected_work_days = 5f, work_weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday'],
  created_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT employee_pay_profile:demo_cook SET
  employee = employee:demo_cook, pay_type = 'hourly', base_rate = 22f,
  currency = 'USD', effective_from = time::now() - 90d,
  maximum_hours_per_day = 8f, maximum_hours_per_week = 40f,
  expected_work_days = 5f, work_weekdays = ['Tuesday','Wednesday','Thursday','Friday','Saturday'],
  created_by = user:ldor4zsa96nmrnrc2n8o;

UPSERT leave_type:demo_annual SET
  code = 'ANNUAL', name = 'Annual Leave', paid = true, requires_approval = true,
  accrual_rate = 1.5f, max_days_per_year = 18f, is_active = true;
UPSERT labor_pay_rule:demo_overtime SET
  code = 'OT150', name = 'Overtime 1.5x', priority = 10, is_active = true,
  exclusive = false, stacking_mode = 'allow',
  conditions = { after_daily_hours: 8 },
  effects = [{ type: 'multiplier', value: 1.5, applies_to: 'overtime_hours' }];

UPSERT work_schedule:demo_current SET
  name = 'Demo Weekly Roster', period_start = time::now() - 2d,
  period_end = time::now() + 5d, status = 'published',
  published_at = time::now() - 2d, published_by = user:ldor4zsa96nmrnrc2n8o;
UPSERT scheduled_shift:demo_cashier_today SET
  employee = employee:demo_cashier, start_at = time::now() - 8h,
  end_at = time::now(), department = department:demo_operations,
  position = position:demo_cashier, cost_center = cost_center:demo_front,
  shift_template = shift:dwkbywt5mfi88e8r8gwe,
  work_schedule = work_schedule:demo_current, status = 'completed';
UPSERT scheduled_shift:demo_cook_today SET
  employee = employee:demo_cook, start_at = time::now() - 7h,
  end_at = time::now() + 1h, department = department:demo_kitchen,
  position = position:demo_cook, cost_center = cost_center:demo_back,
  shift_template = shift:dwkbywt5mfi88e8r8gwe,
  work_schedule = work_schedule:demo_current, status = 'scheduled';
UPSERT time_entry:demo_cashier_today SET
  user = user:gshwt74pxo5kmnim6ppd, employee = employee:demo_cashier,
  clock_in = time::now() - 8h, clock_out = time::now() - 15m,
  approval_status = 'approved', approved_at = time::now() - 10m,
  approved_by = user:ldor4zsa96nmrnrc2n8o, attendance_status = 'present',
  late_minutes = 5f, early_leave_minutes = 0f, source = 'demo', platform = 'local',
  scheduled_shift = scheduled_shift:demo_cashier_today,
  shift_template = shift:dwkbywt5mfi88e8r8gwe;
UPSERT time_entry:demo_cook_yesterday SET
  user = user:xctfnhj7nv11jvwl2i3n, employee = employee:demo_cook,
  clock_in = time::now() - 31h, clock_out = time::now() - 23h,
  approval_status = 'approved', approved_at = time::now() - 22h,
  approved_by = user:ldor4zsa96nmrnrc2n8o, attendance_status = 'present',
  late_minutes = 0f, early_leave_minutes = 0f, source = 'demo', platform = 'local',
  shift_template = shift:dwkbywt5mfi88e8r8gwe;

UPSERT payroll_period:demo_current SET
  name = 'Current Demo Week', start_date = time::now() - 2d,
  end_date = time::now() + 5d, period_type = 'weekly', status = 'open';
UPSERT payroll_run:demo_current SET
  payroll_period = payroll_period:demo_current, run_number = 1,
  status = 'draft', notes = 'Demo payroll run';

-- A minimal chart of accounts and balanced sample journal entry.
UPSERT account:demo_cash SET
  code = '1010', name = 'Cash on Hand', account_type = 'asset',
  group = account_group:ohh5yogchyn5adxwalma, normal_balance = 'debit', is_active = true;
UPSERT account:demo_inventory SET
  code = '1200', name = 'Inventory', account_type = 'asset',
  group = account_group:ohh5yogchyn5adxwalma, normal_balance = 'debit', is_active = true;
UPSERT account:demo_sales SET
  code = '5010', name = 'Food Sales', account_type = 'income',
  group = account_group:c43s88dsuc3w9306ej84, normal_balance = 'credit', is_active = true;
UPSERT account:demo_cogs SET
  code = '2010', name = 'Cost of Goods Sold', account_type = 'expense',
  group = account_group:pqq0gs3aiizl3bwsib4n, normal_balance = 'debit', is_active = true;
UPSERT account:demo_expense SET
  code = '2090', name = 'Operating Expenses', account_type = 'expense',
  group = account_group:pqq0gs3aiizl3bwsib4n, normal_balance = 'debit', is_active = true;
UPSERT account_journal_entry:demo_opening SET
  date = time::now() - 1d, entry_number = 9001, status = 'posted',
  memo = 'Demo opening balance', created_by = user:ldor4zsa96nmrnrc2n8o,
  idempotency_key = 'demo-opening-journal';
UPSERT account_journal_line:demo_opening_debit SET
  entry = account_journal_entry:demo_opening, account = account:demo_cash,
  debit = 50000f, credit = 0f, description = 'Opening cash';
UPSERT account_journal_line:demo_opening_credit SET
  entry = account_journal_entry:demo_opening, account = account:demo_sales,
  debit = 0f, credit = 50000f, description = 'Opening sales balance';
UPDATE account_journal_entry:demo_opening SET
  lines = [account_journal_line:demo_opening_debit, account_journal_line:demo_opening_credit];

-- Recent order history for dashboards and reports. The demo uses existing menu,
-- tax, order type, payment type, floor, and user records from demo-data.surql.
UPSERT order_item:demo_order_1_item SET
  order = order:demo_paid_1, item = menu_item:j5ntlpc0prt80p1xohem,
  category = 'Deals', category_id = category:9a3ho9s5hm015q9wkyqx,
  menu = 'Delivery', created_at = time::now() - 4h,
  created_by = user:ldor4zsa96nmrnrc2n8o, level = 0, position = 0,
  price = 999f, original_price = 999f, quantity = 1f, discount = 0f,
  tax = 50f, service_charges = 0f, tax_mode = 'exclusive',
  taxes = [tax:v85ljf2abnpsibddy3hr], is_addition = false;
UPSERT order_payment:demo_order_1_payment SET
  amount = 1049f, payable = 1049f, comments = 'Demo cash sale',
  payment_type = payment_type:9med8dx3hy0g3xspet3b;
UPSERT order_tax:demo_order_1_tax SET
  order = order:demo_paid_1, tax = tax:v85ljf2abnpsibddy3hr, amount = 50f;
UPSERT order:demo_paid_1 SET
  auto_id = 9001, invoice_number = 9001, created_at = time::now() - 4h,
  completed_at = time::now() - 3h, updated_at = time::now() - 3h,
  status = 'Paid', order_type = order_type:c1akh3xwlhn8sgom2rlc,
  floor = floor:6b6em0ltgn5ueu3i8sb2, `table` = floor_table:26gsdh79vjvyswb31m36,
  user = user:ldor4zsa96nmrnrc2n8o, cashier = user:ldor4zsa96nmrnrc2n8o,
  customer = customer:demo_alex, covers = 2,
  items = [order_item:demo_order_1_item], payments = [order_payment:demo_order_1_payment],
  order_taxes = [order_tax:demo_order_1_tax], order_discounts = [], extras = [],
  discount_amount = 0f, discount_rate = 0f, tax_amount = 50f,
  service_charge_amount = 0f, tip = 0f, tip_amount = 0f,
  tags = ['Normal', 'Demo'];

UPSERT order_item:demo_order_2_item SET
  order = order:demo_paid_2, item = menu_item:2sbvmrqpox1349gebql8,
  category = 'Pasta & Fries', category_id = category:ce5us9u1dsrz4vh94ow8,
  menu = 'Delivery', created_at = time::now() - 27h,
  created_by = user:gshwt74pxo5kmnim6ppd, level = 0, position = 0,
  price = 799f, original_price = 799f, quantity = 2f, discount = 100f,
  tax = 75f, service_charges = 0f, tax_mode = 'exclusive',
  taxes = [tax:v85ljf2abnpsibddy3hr], is_addition = false;
UPSERT order_payment:demo_order_2_payment SET
  amount = 1573f, payable = 1573f, comments = 'Demo card sale',
  payment_type = payment_type:8ckk6gbkegp5w8zhwqas;
UPSERT order_tax:demo_order_2_tax SET
  order = order:demo_paid_2, tax = tax:v85ljf2abnpsibddy3hr, amount = 75f;
UPSERT order:demo_paid_2 SET
  auto_id = 9002, invoice_number = 9002, created_at = time::now() - 27h,
  completed_at = time::now() - 26h, updated_at = time::now() - 26h,
  status = 'Paid', order_type = order_type:asv1e0weopsi8e3yhbh6,
  user = user:gshwt74pxo5kmnim6ppd, cashier = user:gshwt74pxo5kmnim6ppd,
  customer = customer:demo_samira, covers = 1,
  items = [order_item:demo_order_2_item], payments = [order_payment:demo_order_2_payment],
  order_taxes = [order_tax:demo_order_2_tax], order_discounts = [], extras = [],
  discount_amount = 100f, discount_rate = 0f, tax_amount = 75f,
  service_charge_amount = 0f, tip = 0f, tip_amount = 0f,
  tags = ['Take Away', 'Demo'];

UPSERT order_item:demo_order_3_item SET
  order = order:demo_paid_3, item = menu_item:3bkg7jcqi8r9orzhdt7i,
  category = 'Starter', category_id = category:chyeo5cjlarqh8ukj8pf,
  menu = 'Delivery', created_at = time::now() - 6d,
  created_by = user:xctfnhj7nv11jvwl2i3n, level = 0, position = 0,
  price = 799f, original_price = 799f, quantity = 3f, discount = 0f,
  tax = 120f, service_charges = 100f, tax_mode = 'exclusive',
  taxes = [tax:v85ljf2abnpsibddy3hr], is_addition = false;
UPSERT order_payment:demo_order_3_payment SET
  amount = 2617f, payable = 2617f, comments = 'Demo weekly sale',
  payment_type = payment_type:9med8dx3hy0g3xspet3b;
UPSERT order_tax:demo_order_3_tax SET
  order = order:demo_paid_3, tax = tax:v85ljf2abnpsibddy3hr, amount = 120f;
UPSERT order:demo_paid_3 SET
  auto_id = 9003, invoice_number = 9003, created_at = time::now() - 6d,
  completed_at = time::now() - 6d + 45m, updated_at = time::now() - 6d + 45m,
  status = 'Paid', order_type = order_type:c1akh3xwlhn8sgom2rlc,
  floor = floor:6b6em0ltgn5ueu3i8sb2, `table` = floor_table:1viq86dmy98rq3qofjuk,
  user = user:xctfnhj7nv11jvwl2i3n, cashier = user:gshwt74pxo5kmnim6ppd,
  customer = customer:demo_corporate, covers = 4,
  items = [order_item:demo_order_3_item], payments = [order_payment:demo_order_3_payment],
  order_taxes = [order_tax:demo_order_3_tax], order_discounts = [], extras = [],
  discount_amount = 0f, discount_rate = 0f, tax_amount = 120f,
  service_charge = 100f, service_charge_type = 'Fixed', service_charge_amount = 100f,
  tip = 5f, tip_type = 'Percent', tip_amount = 120f,
  tags = ['Normal', 'Demo'];

UPSERT order_item:demo_cancelled_item SET
  order = order:demo_cancelled, item = menu_item:0cn4zawg88sc1ip7p4hl,
  category = 'Starter', category_id = category:chyeo5cjlarqh8ukj8pf,
  menu = 'Delivery', created_at = time::now() - 2h,
  created_by = user:gshwt74pxo5kmnim6ppd, level = 0, position = 0,
  price = 499f, original_price = 499f, quantity = 1f, discount = 0f,
  tax = 0f, service_charges = 0f, tax_mode = 'exclusive', taxes = [],
  is_addition = false;
UPSERT order:demo_cancelled SET
  auto_id = 9004, invoice_number = 9004, created_at = time::now() - 2h,
  updated_at = time::now() - 90m, status = 'Cancelled',
  order_type = order_type:asv1e0weopsi8e3yhbh6,
  user = user:gshwt74pxo5kmnim6ppd, cashier = user:gshwt74pxo5kmnim6ppd,
  covers = 1, items = [order_item:demo_cancelled_item], payments = [],
  order_taxes = [], order_discounts = [], extras = [], discount_amount = 0f,
  discount_rate = 0f, tax_amount = 0f, service_charge_amount = 0f,
  tip = 0f, tip_amount = 0f, tags = ['Cancelled', 'Demo'];

-- Keep one active ticket so the default Orders filter and the KDS are not empty.
UPSERT order_item:demo_open_item SET
  order = order:demo_open, item = menu_item:i2o0jh8ssiktd41trlt6,
  category = 'Starter', category_id = category:chyeo5cjlarqh8ukj8pf,
  menu = 'Delivery', created_at = time::now() - 20m,
  created_by = user:xctfnhj7nv11jvwl2i3n, level = 0, position = 0,
  price = 499f, original_price = 499f, quantity = 2f, discount = 0f,
  tax = 50f, service_charges = 0f, tax_mode = 'exclusive',
  taxes = [tax:v85ljf2abnpsibddy3hr], is_addition = false,
  workflow_status = 'received';
UPSERT order:demo_open SET
  auto_id = 9005, invoice_number = 9005, created_at = time::now() - 20m,
  updated_at = time::now() - 20m, status = 'In Progress',
  order_type = order_type:c1akh3xwlhn8sgom2rlc,
  floor = floor:6b6em0ltgn5ueu3i8sb2, `table` = floor_table:24sepo4crz7f0j7m1j1y,
  user = user:xctfnhj7nv11jvwl2i3n, cashier = user:gshwt74pxo5kmnim6ppd,
  customer = customer:demo_samira, covers = 2,
  items = [order_item:demo_open_item], payments = [], order_taxes = [],
  order_discounts = [], extras = [], discount_amount = 0f, discount_rate = 0f,
  tax_amount = 50f, service_charge_amount = 0f, tip = 0f, tip_amount = 0f,
  tags = ['Normal', 'Demo'];
UPSERT order_item_kitchen:demo_open_kitchen SET
  created_at = time::now() - 20m, activated_at = time::now() - 20m,
  kitchen = kitchen:n2xrcspsjhuq7lc24b6l,
  order_item = order_item:demo_open_item, status = 'pending',
  sequence = 0, is_terminal = true, completed_by = [];

COMMIT TRANSACTION;
