/**
 * SQLite schema for AETHERA UMKM (per PRD section 11).
 * Executed on every DB open; all statements are idempotent.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS business_profile (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  type        TEXT,
  owner       TEXT,
  logo_base64 TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL CHECK(type IN ('penjualan', 'pembelian', 'both')),
  color      TEXT DEFAULT '#F5A623',
  icon       TEXT,
  is_active  INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id),
  sell_price     REAL DEFAULT 0,
  buy_price      REAL DEFAULT 0,
  unit           TEXT DEFAULT 'pcs',
  description    TEXT,
  is_active      INTEGER DEFAULT 1,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER REFERENCES products(id),
  product_name   TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id),
  quantity       REAL NOT NULL DEFAULT 1,
  unit_price     REAL NOT NULL,
  total_amount   REAL NOT NULL,
  payment_method TEXT DEFAULT 'tunai' CHECK(payment_method IN ('tunai','transfer','qris','lainnya')),
  notes          TEXT,
  transaction_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER REFERENCES products(id),
  item_name      TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id),
  quantity       REAL NOT NULL DEFAULT 1,
  unit_price     REAL NOT NULL,
  total_amount   REAL NOT NULL,
  supplier       TEXT,
  payment_method TEXT DEFAULT 'tunai' CHECK(payment_method IN ('tunai','transfer','qris','lainnya')),
  notes          TEXT,
  transaction_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Target omset (per periode)
CREATE TABLE IF NOT EXISTS targets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  period      TEXT NOT NULL CHECK(period IN ('harian','bulanan')),
  amount      REAL NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Achievement / badge yang sudah diraih
CREATE TABLE IF NOT EXISTS achievements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  unlocked_at TEXT DEFAULT (datetime('now'))
);

-- Transaksi berulang (recurring template)
CREATE TABLE IF NOT EXISTS recurring (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kind           TEXT NOT NULL CHECK(kind IN ('penjualan','pembelian')),
  name           TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id),
  quantity       REAL NOT NULL DEFAULT 1,
  unit_price     REAL NOT NULL,
  payment_method TEXT DEFAULT 'tunai',
  channel        TEXT,
  notes          TEXT,
  frequency      TEXT NOT NULL DEFAULT 'bulanan' CHECK(frequency IN ('harian','mingguan','bulanan')),
  next_run       TEXT NOT NULL,
  is_active      INTEGER DEFAULT 1,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Riwayat insight AI (cache)
CREATE TABLE IF NOT EXISTS ai_insights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  content     TEXT NOT NULL,
  model       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Pengguna aplikasi (multi-user: pemilik & kasir)
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'kasir' CHECK(role IN ('pemilik','kasir')),
  pin_hash    TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Log webhook (integrasi pihak ketiga)
CREATE TABLE IF NOT EXISTS webhook_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event       TEXT NOT NULL,
  status      TEXT,
  detail      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Master data supplier
CREATE TABLE IF NOT EXISTS suppliers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Master data pelanggan (customer)
CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  is_active   INTEGER DEFAULT 1,
  total_spent REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Riwayat mutasi stok (stock ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  delta       REAL NOT NULL,
  reason      TEXT NOT NULL CHECK(reason IN ('penjualan','pembelian','opname','adjustment','retur')),
  ref_id      INTEGER,
  notes       TEXT,
  stock_after REAL NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Invoice counter per tahun
CREATE TABLE IF NOT EXISTS invoice_counter (
  year        INTEGER PRIMARY KEY,
  last_seq    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_transaction_at ON sales(transaction_at);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_at ON purchases(transaction_at);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(category_id);
CREATE INDEX IF NOT EXISTS idx_purchases_category ON purchases(category_id);
`;

/**
 * Additive column migrations applied at runtime (idempotent).
 * Each entry is tried; failures (e.g. column exists) are ignored.
 */
export const COLUMN_MIGRATIONS: string[] = [
  "ALTER TABLE products ADD COLUMN stock REAL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN track_stock INTEGER DEFAULT 0",
  "ALTER TABLE products ADD COLUMN low_stock_threshold REAL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN barcode TEXT",
  "ALTER TABLE sales ADD COLUMN channel TEXT",
  "ALTER TABLE purchases ADD COLUMN channel TEXT",
  "ALTER TABLE sales ADD COLUMN cashier_id INTEGER",
  "ALTER TABLE sales ADD COLUMN cashier_name TEXT",
  // v2 migrations
  "ALTER TABLE sales ADD COLUMN invoice_number TEXT",
  "ALTER TABLE purchases ADD COLUMN invoice_number TEXT",
  "ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0",
  "ALTER TABLE purchases ADD COLUMN discount_amount REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN shipping_fee REAL DEFAULT 0",
  "ALTER TABLE purchases ADD COLUMN shipping_fee REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN customer_id INTEGER",
  "ALTER TABLE sales ADD COLUMN customer_name TEXT",
  "ALTER TABLE purchases ADD COLUMN supplier_id INTEGER",
  "ALTER TABLE business_profile ADD COLUMN logo_base64 TEXT",
  "ALTER TABLE business_profile ADD COLUMN wa_number TEXT",
];

/** Default categories seeded on first run. */
export const SEED_CATEGORIES: Array<{
  name: string;
  type: "penjualan" | "pembelian" | "both";
  color: string;
  icon: string;
}> = [
  { name: "Makanan & Minuman", type: "penjualan", color: "#F5A623", icon: "utensils" },
  { name: "Barang Dagangan", type: "penjualan", color: "#4FC3F7", icon: "package" },
  { name: "Jasa", type: "penjualan", color: "#4CAF50", icon: "wrench" },
  { name: "Lainnya (Penjualan)", type: "penjualan", color: "#9BA3B8", icon: "tag" },
  { name: "Bahan Baku", type: "pembelian", color: "#FF8C42", icon: "wheat" },
  { name: "Operasional", type: "pembelian", color: "#2196F3", icon: "settings" },
  { name: "Gaji", type: "pembelian", color: "#F44336", icon: "users" },
  { name: "Sewa", type: "pembelian", color: "#FFC107", icon: "home" },
  { name: "Lainnya (Pembelian)", type: "pembelian", color: "#9BA3B8", icon: "tag" },
];
