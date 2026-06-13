/**
 * Convert a STATIC QRIS string (from the merchant's printed QR) into a
 * DYNAMIC QRIS with a fixed transaction amount, recomputing the CRC16 checksum.
 *
 * This is the standard, offline technique used widely in Indonesia:
 *  - Change tag 01 (point of initiation) from "11" (static) to "12" (dynamic)
 *  - Insert tag 54 (transaction amount) before tag 58 (country code)
 *  - Recompute the CRC16-CCITT (tag 63) over the whole string
 *
 * No funds move through this app — the customer still scans & pays via their
 * own banking/e-wallet app. We only embed the amount for convenience.
 */

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

export interface QrisResult {
  payload: string;
}

/** Build dynamic QRIS payload from a static QRIS string and an amount. */
export function buildDynamicQris(staticQris: string, amount: number): QrisResult {
  let qris = staticQris.trim();

  // Drop existing CRC (last 8 chars: "6304XXXX")
  if (qris.length > 8) {
    qris = qris.slice(0, -8);
  }

  // Set point of initiation method to dynamic (010212)
  qris = qris.replace("010211", "010212");

  // Build amount tag (54)
  const amountTag = tlv("54", String(Math.round(amount)));

  // Insert amount tag right before the country code tag (5802ID)
  const marker = "5802ID";
  const idx = qris.indexOf(marker);
  if (idx >= 0) {
    qris = qris.slice(0, idx) + amountTag + qris.slice(idx);
  } else {
    qris = qris + amountTag;
  }

  // Append CRC tag id + length, then compute checksum over everything so far.
  const withCrcId = qris + "6304";
  const checksum = crc16(withCrcId);

  return { payload: withCrcId + checksum };
}

/** Basic sanity check that a string looks like a QRIS payload. */
export function looksLikeQris(s: string): boolean {
  const t = s.trim();
  return t.startsWith("00020101") || t.startsWith("000201");
}
