"use client";

import Tesseract from "tesseract.js";

export interface OcrResult {
  rawText: string;
  amounts: number[];
  bestAmount: number | null;
}

/** Extract numeric amounts from raw OCR text (Indonesian rupiah format). */
function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  // Match number groups like 1.250.000 or 12,500 or 15000
  const regex = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const cleaned = m[1].replace(/[.,]/g, "");
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 100) amounts.push(num);
  }
  return amounts;
}

/**
 * Run OCR on an image and try to detect the total amount.
 * Prefers a number appearing near keywords like "total"/"bayar".
 */
export async function scanReceipt(
  image: File | Blob | string,
  onProgress?: (p: number) => void
): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(image, "ind+eng", {
    logger: (msg) => {
      if (msg.status === "recognizing text" && onProgress) {
        onProgress(Math.round(msg.progress * 100));
      }
    },
  });

  const text = data.text || "";
  const amounts = extractAmounts(text);

  // Try to find amount near "total"/"bayar"/"jumlah" keyword lines.
  let bestAmount: number | null = null;
  const lines = text.split(/\n/);
  for (const line of lines) {
    if (/total|bayar|jumlah|grand/i.test(line)) {
      const found = extractAmounts(line);
      if (found.length) {
        bestAmount = Math.max(...found);
      }
    }
  }
  // Fall back to the largest detected amount.
  if (bestAmount == null && amounts.length) {
    bestAmount = Math.max(...amounts);
  }

  return { rawText: text, amounts, bestAmount };
}
