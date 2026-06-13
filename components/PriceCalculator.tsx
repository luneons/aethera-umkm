"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatThousands, parseRupiah, formatRupiah } from "@/lib/utils/format";
import { calculateSellingPrice } from "@/lib/utils/priceCalc";

interface Props {
  open: boolean;
  onClose: () => void;
  initialCost?: number;
  onApply: (price: number) => void;
}

export function PriceCalculator({ open, onClose, initialCost = 0, onApply }: Props) {
  const [cost, setCost] = useState("");
  const [opCost, setOpCost] = useState("");
  const [margin, setMargin] = useState("30");
  const [mode, setMode] = useState<"markup" | "margin">("markup");

  useEffect(() => {
    if (open) setCost(initialCost ? formatThousands(String(initialCost)) : "");
  }, [open, initialCost]);

  const result = calculateSellingPrice({
    cost: parseRupiah(cost),
    operationalCost: parseRupiah(opCost),
    marginPercent: parseFloat(margin) || 0,
    mode,
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Kalkulator Harga Jual"
      footer={
        <Button
          fullWidth
          size="lg"
          onClick={() => onApply(result.sellingPrice)}
          disabled={!result.sellingPrice}
        >
          Pakai Harga {formatRupiah(result.sellingPrice)}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Harga Modal (HPP) per unit">
          <Input
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(formatThousands(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label="Biaya Operasional per unit" hint="Kemasan, listrik, dll. (opsional)">
          <Input
            inputMode="numeric"
            value={opCost}
            onChange={(e) => setOpCost(formatThousands(e.target.value))}
            placeholder="0"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Metode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as "markup" | "margin")}>
              <option value="markup">Markup (% dari modal)</option>
              <option value="margin">Margin (% dari harga jual)</option>
            </Select>
          </Field>
          <Field label="Persentase (%)">
            <Input
              type="number"
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Total modal</span>
            <span className="font-medium">{formatRupiah(result.totalCost)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Laba per unit</span>
            <span className="font-medium text-[var(--color-success)]">
              {formatRupiah(result.profit)}
            </span>
          </div>
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Harga Jual Disarankan
              </span>
              <span className="text-xl font-bold text-[var(--color-accent-gold)]">
                {formatRupiah(result.sellingPrice)}
              </span>
            </div>
            <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
              Margin efektif {result.effectiveMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
