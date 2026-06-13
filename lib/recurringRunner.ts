"use client";

import { getDueRecurring, advanceRecurring } from "@/lib/db/queries/recurring";
import { createSale } from "@/lib/db/queries/sales";
import { createPurchase } from "@/lib/db/queries/purchases";
import { fromSqlDateTime } from "@/lib/utils/format";
import { toast } from "@/lib/stores/useToastStore";

/**
 * Process recurring templates whose next_run has passed.
 * Creates the transaction and advances next_run. Returns count processed.
 */
export async function processDueRecurring(): Promise<number> {
  const due = await getDueRecurring();
  let count = 0;
  for (const item of due) {
    const base = {
      productId: null,
      categoryId: item.category_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalAmount: item.quantity * item.unit_price,
      paymentMethod: item.payment_method,
      channel: item.channel,
      notes: item.notes,
      transactionAt: fromSqlDateTime(item.next_run),
    };
    if (item.kind === "penjualan") {
      await createSale({ ...base, productName: item.name });
    } else {
      await createPurchase({ ...base, itemName: item.name });
    }
    await advanceRecurring(item.id, item.frequency, new Date());
    count++;
  }
  if (count > 0) {
    toast.info(`${count} transaksi berulang dicatat otomatis`);
  }
  return count;
}
