"use client";

import { useEffect, useState } from "react";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { getSetting, setSetting } from "@/lib/db/queries/settings";
import {
  OPENROUTER_KEY_SETTING,
  OPENROUTER_MODEL_SETTING,
  DEFAULT_MODEL,
  AVAILABLE_MODELS,
  testOpenRouterKey,
} from "@/lib/ai/openrouter";
import { toast } from "@/lib/stores/useToastStore";

export function AiSettings() {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const k = await getSetting(OPENROUTER_KEY_SETTING);
      const m = await getSetting(OPENROUTER_MODEL_SETTING);
      if (k) setKey(k);
      if (m) setModel(m);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (key.trim()) {
        const valid = await testOpenRouterKey(key.trim());
        if (!valid) {
          toast.error("API key tidak valid atau koneksi gagal");
          return;
        }
      }
      await setSetting(OPENROUTER_KEY_SETTING, key.trim());
      await setSetting(OPENROUTER_MODEL_SETTING, model);
      toast.success("Pengaturan AI disimpan");
    } catch {
      toast.error("Gagal menyimpan / memvalidasi key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <Sparkles size={18} className="text-[var(--color-accent-gold)]" /> AI Insight
        (OpenRouter)
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Masukkan API key OpenRouter untuk mengaktifkan analisis AI. Buat gratis di{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent-gold)] underline"
        >
          openrouter.ai/keys
        </a>
        . Key disimpan lokal di perangkatmu.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="API Key">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-label="Tampilkan key"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Model AI">
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button loading={saving} onClick={save}>
          Simpan & Validasi
        </Button>
      </div>
    </Card>
  );
}
