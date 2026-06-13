import { query } from "@/lib/db/client";

/**
 * PPh Final UMKM (PP 55/2022): tarif 0,5% dari peredaran bruto (omset),
 * dengan fasilitas omset Rp500 juta/tahun pertama tidak kena pajak (untuk WP OP).
 */
export const UMKM_TAX_RATE = 0.005;
export const ANNUAL_EXEMPTION = 500_000_000;

export interface MonthlyTax {
  month: string; // YYYY-MM
  gross: number;
  taxable: number;
  tax: number;
}

/** Monthly gross revenue and 0.5% tax for a given year. */
export async function getMonthlyTax(year: number): Promise<MonthlyTax[]> {
  const rows = await query<{ ym: string; gross: number }>(
    `SELECT strftime('%Y-%m', transaction_at) AS ym, SUM(total_amount) AS gross
     FROM sales
     WHERE strftime('%Y', transaction_at) = ?
     GROUP BY ym ORDER BY ym ASC`,
    [String(year)]
  );

  // Apply the cumulative annual exemption for WP Orang Pribadi.
  let cumulative = 0;
  const map = new Map<string, { gross: number }>();
  for (const r of rows) map.set(r.ym, { gross: Number(r.gross) });

  const result: MonthlyTax[] = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    const gross = map.get(ym)?.gross ?? 0;
    const before = cumulative;
    cumulative += gross;
    // Portion of this month's gross above the exemption is taxable.
    let taxable = 0;
    if (cumulative > ANNUAL_EXEMPTION) {
      taxable = Math.min(gross, cumulative - Math.max(before, ANNUAL_EXEMPTION));
      if (taxable < 0) taxable = 0;
    }
    result.push({
      month: ym,
      gross,
      taxable,
      tax: Math.round(taxable * UMKM_TAX_RATE),
    });
  }
  return result;
}

export async function getYearlyGross(year: number): Promise<number> {
  const rows = await query<{ gross: number }>(
    `SELECT COALESCE(SUM(total_amount),0) AS gross FROM sales
     WHERE strftime('%Y', transaction_at) = ?`,
    [String(year)]
  );
  return Number(rows[0]?.gross ?? 0);
}
