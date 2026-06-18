export type PaymentMethod = "tunai" | "transfer" | "qris" | "lainnya";
export type CategoryType = "penjualan" | "pembelian" | "both";

export interface BusinessProfile {
  id: number;
  name: string;
  type: string | null;
  owner: string | null;
  logo_base64: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string | null;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number | null;
  sell_price: number;
  buy_price: number;
  unit: string;
  description: string | null;
  is_active: number;
  stock: number;
  track_stock: number;
  low_stock_threshold: number;
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  product_id: number | null;
  product_name: string;
  category_id: number | null;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  discount_amount?: number;
  shipping_fee?: number;
  payment_method: PaymentMethod;
  notes: string | null;
  invoice_number?: string | null;
  transaction_at: string;
  cashier_id?: number | null;
  cashier_name?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  product_id: number | null;
  item_name: string;
  category_id: number | null;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  discount_amount?: number;
  shipping_fee?: number;
  supplier: string | null;
  supplier_id?: number | null;
  payment_method: PaymentMethod;
  notes: string | null;
  invoice_number?: string | null;
  transaction_at: string;
  created_at: string;
  updated_at: string;
}

export type TxKind = "penjualan" | "pembelian";

export interface RecentTransaction {
  id: number;
  kind: TxKind;
  name: string;
  total_amount: number;
  transaction_at: string;
}

export interface DailySummary {
  total_penjualan: number;
  total_pembelian: number;
  laba: number;
}

export interface TrendPoint {
  tanggal: string;
  penjualan: number;
  pembelian: number;
}

export interface CategoryBreakdown {
  name: string;
  color: string;
  total: number;
}

export interface TopProduct {
  product_name: string;
  total_qty: number;
  total_omset: number;
}

export type SalesChannel = "langsung" | "gofood" | "grabfood" | "shopeefood" | "whatsapp" | "tokopedia" | "shopee" | "lainnya";

export interface Target {
  id: number;
  period: "harian" | "bulanan";
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: number;
  code: string;
  unlocked_at: string;
}

export interface Recurring {
  id: number;
  kind: TxKind;
  name: string;
  category_id: number | null;
  quantity: number;
  unit_price: number;
  payment_method: PaymentMethod;
  channel: string | null;
  notes: string | null;
  frequency: "harian" | "mingguan" | "bulanan";
  next_run: string;
  is_active: number;
  created_at: string;
}

export interface ProfitLossRow {
  product_name: string;
  qty: number;
  revenue: number;
  cogs: number;
  profit: number;
}

export interface ChannelBreakdown {
  channel: string;
  total: number;
  count: number;
}

export type UserRole = "pemilik" | "kasir";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  pin_hash: string;
  is_active: number;
  created_at: string;
}

export type PlanTier = "free" | "premium";

export interface TaxReport {
  period: string;
  grossRevenue: number;
  taxRate: number;
  taxDue: number;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// ─── Stock Movement ──────────────────────────────────────────────────────────

export type StockMovementReason = "penjualan" | "pembelian" | "opname" | "adjustment" | "retur";

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  delta: number;
  reason: StockMovementReason;
  ref_id: number | null;
  notes: string | null;
  stock_after: number;
  created_at: string;
}

// ─── Cart item (multi-item transaction) ──────────────────────────────────────

export interface CartItem {
  productId: number | null;
  productName: string;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalAmount: number;
}
