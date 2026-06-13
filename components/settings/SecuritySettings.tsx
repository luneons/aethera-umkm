"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { isPinEnabled, setPin, disablePin } from "@/lib/utils/appLock";
import { toast } from "@/lib/stores/useToastStore";

export function SecuritySettings() {
  const [enabled, setEnabled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    isPinEnabled().then((v) => {
      if (mounted.current) setEnabled(v);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSave = async () => {
    if (!/^\d{6}$/.test(pin1)) {
      toast.error("PIN harus 6 digit angka");
      return;
    }
    if (pin1 !== pin2) {
      toast.error("Konfirmasi PIN tidak cocok");
      return;
    }
    setSaving(true);
    try {
      await setPin(pin1);
      setEnabled(true);
      setShowForm(false);
      setPin1("");
      setPin2("");
      toast.success("PIN aktif. App akan terkunci saat dibuka.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    await disablePin();
    setEnabled(false);
    toast.success("PIN dinonaktifkan");
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <ShieldCheck size={18} className="text-[var(--color-accent-gold)]" /> Keamanan
        (PIN)
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Kunci aplikasi dengan PIN 6 digit untuk melindungi data keuanganmu.
      </p>

      {enabled ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 px-4 py-3 text-sm text-[var(--color-success)]">
            <ShieldCheck size={16} /> PIN aktif
          </div>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Ubah PIN
          </Button>
          <Button variant="danger" onClick={handleDisable}>
            Nonaktifkan PIN
          </Button>
        </div>
      ) : !showForm ? (
        <Button onClick={() => setShowForm(true)}>Aktifkan PIN</Button>
      ) : null}

      {showForm && (
        <div className="mt-3 flex flex-col gap-3">
          <Field label="PIN Baru (6 digit)">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin1}
              onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
            />
          </Field>
          <Field label="Konfirmasi PIN">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button fullWidth loading={saving} onClick={handleSave}>
              Simpan PIN
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
