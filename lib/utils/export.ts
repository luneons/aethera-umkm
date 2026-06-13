"use client";

import { jsPDF } from "jspdf";
import Papa from "papaparse";
import { formatRupiah, formatDateTime, formatDate } from "./format";
import type { Sale, Purchase } from "@/lib/db/types";

interface ReportMeta {
  businessName: string;
  owner?: string | null;
  periodLabel: string;
  totalSales: number;
  totalPurchases: number;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportReportPDF(
  meta: ReportMeta,
  sales: Sale[],
  purchases: Purchase[]
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(13, 15, 20);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(245, 166, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AETHERA UMKM", margin, 38);
  doc.setTextColor(240, 242, 248);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Laporan Transaksi", margin, 54);
  y = 95;

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(meta.businessName, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (meta.owner) {
    doc.text(`Pemilik: ${meta.owner}`, margin, y);
    y += 14;
  }
  doc.text(`Periode: ${meta.periodLabel}`, margin, y);
  y += 14;
  doc.text(`Dicetak: ${formatDate(new Date())}`, margin, y);
  y += 24;

  // Summary box
  const laba = meta.totalSales - meta.totalPurchases;
  doc.setDrawColor(220);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 6, 6, "FD");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const col = (pageWidth - margin * 2) / 3;
  doc.text("Total Penjualan", margin + 12, y + 22);
  doc.text("Total Pembelian", margin + 12 + col, y + 22);
  doc.text("Laba Estimasi", margin + 12 + col * 2, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(76, 175, 80);
  doc.text(formatRupiah(meta.totalSales), margin + 12, y + 44);
  doc.setTextColor(244, 67, 54);
  doc.text(formatRupiah(meta.totalPurchases), margin + 12 + col, y + 44);
  doc.setTextColor(laba >= 0 ? 30 : 244, laba >= 0 ? 120 : 67, laba >= 0 ? 60 : 54);
  doc.text(formatRupiah(laba), margin + 12 + col * 2, y + 44);
  y += 92;

  const renderTable = (
    title: string,
    rows: { name: string; date: string; qty: number; amount: number }[]
  ) => {
    if (y > 720) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(title, margin, y);
    y += 16;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.text("Nama", margin, y);
    doc.text("Tanggal", margin + 200, y);
    doc.text("Qty", margin + 330, y);
    doc.text("Total", pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    for (const r of rows) {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(r.name.slice(0, 34), margin, y);
      doc.text(r.date, margin + 200, y);
      doc.text(String(r.qty), margin + 330, y);
      doc.text(formatRupiah(r.amount), pageWidth - margin, y, { align: "right" });
      y += 14;
    }
    y += 16;
  };

  renderTable(
    "Penjualan",
    sales.map((s) => ({
      name: s.product_name,
      date: formatDateTime(s.transaction_at),
      qty: s.quantity,
      amount: s.total_amount,
    }))
  );
  renderTable(
    "Pembelian",
    purchases.map((p) => ({
      name: p.item_name,
      date: formatDateTime(p.transaction_at),
      qty: p.quantity,
      amount: p.total_amount,
    }))
  );

  doc.save(`laporan-aethera-${Date.now()}.pdf`);
}

export function exportReportCSV(sales: Sale[], purchases: Purchase[]) {
  const rows = [
    ...sales.map((s) => ({
      jenis: "Penjualan",
      nama: s.product_name,
      kategori: s.category_name ?? "",
      jumlah: s.quantity,
      harga_satuan: s.unit_price,
      total: s.total_amount,
      metode: s.payment_method,
      catatan: s.notes ?? "",
      waktu: s.transaction_at,
    })),
    ...purchases.map((p) => ({
      jenis: "Pembelian",
      nama: p.item_name,
      kategori: p.category_name ?? "",
      jumlah: p.quantity,
      harga_satuan: p.unit_price,
      total: p.total_amount,
      metode: p.payment_method,
      catatan: p.notes ?? "",
      waktu: p.transaction_at,
    })),
  ].sort((a, b) => b.waktu.localeCompare(a.waktu));

  const csv = Papa.unparse(rows);
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `laporan-aethera-${Date.now()}.csv`);
}

/* ============================ Receipt / Invoice ============================ */

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ReceiptMeta {
  businessName: string;
  owner?: string | null;
  customerName?: string;
  note?: string;
  date?: Date;
}

/** Generate a compact thermal-style receipt PDF (80mm width). */
export function generateReceiptPDF(meta: ReceiptMeta, items: ReceiptItem[]) {
  const width = 226; // ~80mm in pt
  const lineH = 14;
  const itemRows = items.length;
  const height = 180 + itemRows * lineH;

  const doc = new jsPDF({ unit: "pt", format: [width, height] });
  const m = 12;
  let y = 22;

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(meta.businessName.toUpperCase(), width / 2, y, { align: "center" });
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  if (meta.owner) {
    doc.text(meta.owner, width / 2, y, { align: "center" });
    y += 11;
  }
  doc.text(formatDateTime(meta.date ?? new Date()), width / 2, y, { align: "center" });
  y += 8;
  doc.text("--------------------------------", width / 2, y, { align: "center" });
  y += 14;

  let total = 0;
  doc.setFontSize(9);
  for (const it of items) {
    const lineTotal = it.qty * it.unitPrice;
    total += lineTotal;
    doc.text(it.name.slice(0, 28), m, y);
    y += 11;
    doc.text(`${it.qty} x ${formatRupiah(it.unitPrice, false)}`, m, y);
    doc.text(formatRupiah(lineTotal, false), width - m, y, { align: "right" });
    y += 13;
  }

  doc.text("--------------------------------", width / 2, y, { align: "center" });
  y += 14;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", m, y);
  doc.text(formatRupiah(total), width - m, y, { align: "right" });
  y += 18;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  if (meta.customerName) {
    doc.text(`Pelanggan: ${meta.customerName}`, m, y);
    y += 11;
  }
  if (meta.note) {
    doc.text(meta.note.slice(0, 32), m, y);
    y += 11;
  }
  doc.text("Terima kasih!", width / 2, y + 4, { align: "center" });
  y += 16;
  doc.setFontSize(7);
  doc.text("dibuat dengan AETHERA UMKM", width / 2, y, { align: "center" });

  doc.save(`struk-${Date.now()}.pdf`);
}
