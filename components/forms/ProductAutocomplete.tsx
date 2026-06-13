"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { searchActiveProducts } from "@/lib/db/queries/products";
import { formatRupiah } from "@/lib/utils/format";
import type { Product } from "@/lib/db/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  placeholder?: string;
  invalid?: boolean;
}

export function ProductAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  invalid,
}: Props) {
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value.length < 1) {
      setResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const found = await searchActiveProducts(value);
      if (active) setResults(found);
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          invalid={invalid}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-1 shadow-xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-card)]"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {formatRupiah(p.sell_price)} / {p.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
