"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Key, History } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { generateInsight } from "@/lib/ai/insight";
import { getLatestInsight, getInsightHistory, type AiInsight } from "@/lib/db/queries/aiInsights";
import { getSetting } from "@/lib/db/queries/settings";
import { OPENROUTER_KEY_SETTING } from "@/lib/ai/openrouter";
import { formatDateTime } from "@/lib/utils/format";
import { toast } from "@/lib/stores/useToastStore";
import { useAppStore } from "@/lib/stores/useAppStore";
import { usePremium } from "@/lib/stores/usePremium";
import { PremiumGate } from "@/components/PremiumGate";

function renderInsight(text: string) {
  // Lightweight markdown-ish rendering for headings/bullets.
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (/^(📊|💡|✅|🎯|⚠️)/.test(trimmed) || /^\*\*/.test(trimmed)) {
      return (
        <h3 key={i} className="mt-3 font-heading text-sm font-bold">
          {trimmed.replace(/\*\*/g, "")}
        </h3>
      );
    }
    if (/^[-•*]\s/.test(trimmed)) {
      return (
        <li key={i} className="ml-4 list-disc text-sm text-[var(--color-text-secondary)]">
          {trimmed.replace(/^[-•*]\s/, "")}
        </li>
      );
    }
    return (
      <p key={i} className="text-sm text-[var(--color-text-secondary)]">
        {trimmed}
      </p>
    );
  });
}

export default function InsightPage() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const premiumActive = usePremium((s) => s.active);
  const premiumChecked = usePremium((s) => s.checked);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [latest, setLatest] = useState<AiInsight | null>(null);
  const [history, setHistory] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const [k, l, h] = await Promise.all([
      getSetting(OPENROUTER_KEY_SETTING),
      getLatestInsight(),
      getInsightHistory(5),
    ]);
    setHasKey(!!k);
    setLatest(l);
    setHistory(h);
  };

  useEffect(() => {
    refresh();
  }, [dataVersion]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const content = await generateInsight();
      setLatest({ id: Date.now(), content, model: null, created_at: new Date().toISOString() });
      await refresh();
      toast.success("Insight baru dibuat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat insight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="AI Insight"
          subtitle="Analisis bisnis bertenaga AI"
          action={
            hasKey ? (
              <Button onClick={handleGenerate} loading={loading} className="hidden sm:inline-flex">
                <RefreshCw size={16} /> Buat Insight
              </Button>
            ) : null
          }
        />

        {premiumChecked && !premiumActive ? (
          <PremiumGate feature="ai_insight">{null}</PremiumGate>
        ) : hasKey === false ? (
          <Card>
            <EmptyState
              icon={Key}
              title="Atur API Key OpenRouter"
              description="Untuk memakai AI Insight, masukkan API key OpenRouter kamu di Pengaturan. Gratis dibuat di openrouter.ai."
              action={
                <Link href="/pengaturan">
                  <Button>
                    <Key size={16} /> Ke Pengaturan
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Card ref={cardRef}>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 className="font-heading text-base font-bold">Analisis Terbaru</h2>
                  {latest && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDateTime(latest.created_at)}
                    </p>
                  )}
                </div>
              </div>

              {latest ? (
                <div className="flex flex-col gap-0.5">{renderInsight(latest.content)}</div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Belum ada insight"
                  description="Buat analisis pertama dari data bisnismu. AI akan memberi ringkasan, temuan, dan rekomendasi."
                  action={
                    <Button onClick={handleGenerate} loading={loading}>
                      <Sparkles size={16} /> Buat Insight Sekarang
                    </Button>
                  }
                />
              )}
            </Card>

            {latest && (
              <Button onClick={handleGenerate} loading={loading} variant="outline" fullWidth className="sm:hidden">
                <RefreshCw size={16} /> Buat Insight Baru
              </Button>
            )}

            {history.length > 1 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
                  <History size={17} className="text-[var(--color-accent-gold)]" /> Riwayat
                </h2>
                <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                  {history.slice(1).map((h) => (
                    <li key={h.id} className="py-2">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDateTime(h.created_at)}
                      </p>
                      <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                        {h.content.replace(/[#*]/g, "").slice(0, 140)}…
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
