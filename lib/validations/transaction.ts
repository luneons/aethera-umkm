import { z } from "zod";

const oneDayMs = 86_400_000;

const paymentMethod = z.enum(["tunai", "transfer", "qris", "lainnya"]);

const baseFields = {
  quantity: z
    .number({ message: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0")
    .max(999999, "Jumlah terlalu besar"),
  unitPrice: z
    .number({ message: "Harga harus berupa angka" })
    .positive("Harga harus lebih dari 0")
    .max(999999999, "Harga terlalu besar"),
  paymentMethod,
  channel: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional().or(z.literal("")),
  categoryId: z.number().nullable().optional(),
  productId: z.number().nullable().optional(),
  transactionAt: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine(
      (val) => new Date(val).getTime() <= Date.now() + oneDayMs,
      "Tanggal tidak boleh lebih dari 1 hari di masa depan"
    ),
};

export const saleSchema = z.object({
  productName: z.string().min(1, "Nama produk wajib diisi").max(100),
  ...baseFields,
});

export const purchaseSchema = z.object({
  itemName: z.string().min(1, "Nama barang wajib diisi").max(100),
  supplier: z.string().max(100).optional().or(z.literal("")),
  ...baseFields,
});

export type SaleInput = z.infer<typeof saleSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(100),
  categoryId: z.number().nullable().optional(),
  sellPrice: z.number().min(0, "Harga jual tidak boleh negatif").max(999999999),
  buyPrice: z.number().min(0, "Harga beli tidak boleh negatif").max(999999999),
  unit: z.string().min(1, "Satuan wajib diisi").max(20),
  description: z.string().max(300).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  stock: z.number().min(0, "Stok tidak boleh negatif").max(9999999).optional(),
  trackStock: z.boolean().optional(),
  lowStockThreshold: z.number().min(0).max(9999999).optional(),
  barcode: z.string().max(50).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export const businessProfileSchema = z.object({
  name: z.string().min(1, "Nama usaha wajib diisi").max(100),
  type: z.string().max(60).optional().or(z.literal("")),
  owner: z.string().min(1, "Nama pemilik wajib diisi").max(100),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
