import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Settings,
  Sparkles,
  Repeat,
  Boxes,
  Receipt,
  Users,
  Crown,
  Truck,
  UserCircle,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/penjualan", label: "Penjualan", icon: TrendingUp },
  { href: "/pembelian", label: "Pembelian", icon: TrendingDown },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/stok", label: "Stok", icon: Boxes },
  { href: "/pelanggan", label: "Pelanggan", icon: UserCircle },
  { href: "/supplier", label: "Supplier", icon: Truck },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/arus-kas", label: "Arus Kas", icon: ArrowLeftRight },
  { href: "/insight", label: "AI Insight", icon: Sparkles },
  { href: "/berulang", label: "Berulang", icon: Repeat },
  { href: "/pajak", label: "Pajak", icon: Receipt },
  { href: "/pengguna", label: "Pengguna", icon: Users },
  { href: "/premium", label: "Premium", icon: Crown },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

/** Items shown in the mobile bottom navigation (FAB sits in the middle). */
export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/insight", label: "Insight", icon: Sparkles },
  { href: "/produk", label: "Produk", icon: Package },
];
