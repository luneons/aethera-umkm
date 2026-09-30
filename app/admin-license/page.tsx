"use client";

/**
 * Admin License Generator — /admin-license
 *
 * Protected by server-side authentication with an HttpOnly session cookie.
 *
 * Security notes:
 * - Password and license signing secret never enter the browser bundle.
 * - License generation is performed by a protected server endpoint.
 * - History is client session-only (never persisted).
 * - All inputs are sanitised before embedding in generated messages.
 */

import { useEffect, useState } from "react";
import { validateLicense, type LicensePayload } from "@/lib/premium/license";
import { formatDate } from "@/lib/utils/format";

const MAX_NAME_LENGTH = 120;

const ADMIN_PLANS = [
  { label: "Bulanan (30 hari)",      days: 30,   price: "Promo Rp37.500 (50%)" },
  { label: "Tahunan (365 hari)",     days: 365,  price: "Promo Rp200.000 (75%)" },
  { label: "Trial (30 hari gratis)", days: 30,   price: "Gratis" },
  { label: "Lifetime",               days: null, price: "Promo Rp1.350.000 (75%)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitise a string for safe display in HTML/WA message. */
function sanitise(s: string): string {
  return s.replace(/[<>&"'`]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c] ?? c)
  );
}

// ─── Login gate ───────────────────────────────────────────────────────────────

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (response.ok) {
        setPw("");
        onAuth();
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      setErr(true);
      setPw("");
      if (next >= 5) {
        setBlocked(true);
        setTimeout(() => { setBlocked(false); setAttempts(0); setErr(false); }, 60_000);
      }
    } catch {
      setErr(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360, background: "#1a1d24", borderRadius: 16, padding: 28, border: "1px solid #2a2d38" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", color: "#f0f2f8" }}>👑 Admin Panel</h1>
        <p style={{ fontSize: 13, color: "#9ba3b8", margin: "0 0 20px" }}>AETHERA License Generator</p>

        {blocked ? (
          <p style={{ color: "#f44336", fontSize: 13, textAlign: "center", padding: "12px", background: "rgba(244,67,54,0.1)", borderRadius: 8 }}>
            Terlalu banyak percobaan. Coba lagi dalam 1 menit.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(false); }}
              placeholder="Admin password"
              autoComplete="current-password"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${err ? "#f44336" : "#2a2d38"}`,
                background: "#13151b", color: "#f0f2f8", fontSize: 14,
                boxSizing: "border-box", marginBottom: err ? 6 : 12,
              }}
            />
            {err && (
              <p style={{ color: "#f44336", fontSize: 12, margin: "0 0 10px" }}>
                Password salah. Sisa percobaan: {5 - attempts}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: 12, borderRadius: 10, background: "#f5a623", border: "none", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              {submitting ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminLicensePage() {
  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab]           = useState<"generate" | "monitor">("generate");
  const [name, setName]         = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [planIdx, setPlan]      = useState(1);
  const [result, setResult]     = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [verifyKey, setVerify]  = useState("");
  const [verifyResult, setVResult] = useState<string | null>(null);
  const [history, setHistory]   = useState<{ name: string; plan: string; key: string; exp: string; device: string; generated: string }[]>([]);

  // Monitor tab state
  const [activations, setActivations] = useState<{
    key: string; name: string; deviceId: string; ip: string;
    plan: string; expiry: string; activatedAt: string; userAgent: string;
  }[]>([]);
  const [monitorTotal, setMonitorTotal] = useState(0);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorError, setMonitorError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setAuthed(data.authenticated === true))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  // Load activations when switching to monitor tab
  useEffect(() => {
    if (tab !== "monitor" || !authed) return;
    fetchActivations();
  }, [tab, authed]);

  const fetchActivations = async () => {
    setMonitorLoading(true);
    setMonitorError("");
    try {
      const res = await fetch("/api/license/list");
      if (res.status === 401) {
        setAuthed(false);
        throw new Error("Sesi admin berakhir. Silakan masuk kembali");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { activations: typeof activations; total: number };
      setActivations(data.activations || []);
      setMonitorTotal(data.total || 0);
    } catch (e) {
      setMonitorError(`Gagal memuat: ${e instanceof Error ? e.message : "Unknown error"}. Pastikan Upstash KV sudah terkoneksi di Vercel.`);
    } finally {
      setMonitorLoading(false);
    }
  };

  const handleGenerate = async () => {
    const cleanName = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!cleanName) { alert("Isi nama usaha / pembeli dulu"); return; }
    const cleanDevice = deviceId.trim().slice(0, 64);
    const plan = ADMIN_PLANS[planIdx];
    const exp = plan.days ? Date.now() + plan.days * 86_400_000 : null;
    const payload: LicensePayload = {
      name: cleanName,
      plan: "premium",
      exp,
      device: cleanDevice || null,
    };
    setGenerating(true);
    setGenerateError("");
    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null) as { key?: string; error?: string } | null;
      if (response.status === 401) {
        setAuthed(false);
        throw new Error("Sesi admin berakhir. Silakan masuk kembali");
      }
      if (!response.ok || !data?.key) throw new Error(data?.error ?? "Gagal membuat lisensi");
      const key = data.key;
      setResult(key);
      setCopied(false);
      setHistory((prev) => [{
        name: cleanName,
        plan: plan.label,
        key,
        exp: exp ? formatDate(new Date(exp)) : "Lifetime",
        device: cleanDevice || "Tidak terikat (bisa di perangkat mana saja)",
        generated: new Date().toLocaleString("id-ID"),
      }, ...prev]);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Gagal membuat lisensi");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    const k = verifyKey.trim();
    if (!k) return;
    const status = await validateLicense(k);
    if (status.active) {
      const exp = status.payload?.exp ? `Berlaku s/d ${formatDate(new Date(status.payload.exp))}` : "Lifetime";
      const dev = status.payload?.device ? ` · 🔒 terikat ke ${status.payload.device}` : " · 🔓 tidak terikat";
      setVResult(`✅ VALID — ${status.payload?.name} · ${exp}${dev}`);
    } else {
      // Even if not active on THIS device, decode the payload info if it's just device-mismatch
      const reason = status.reason ?? "Unknown";
      const dev = status.payload?.device ? ` (terikat ke ${status.payload.device})` : "";
      setVResult(`❌ ${reason}${dev}`);
    }
  };

  const handleWhatsApp = (entry: typeof history[0]) => {
    const safeName = sanitise(entry.name);
    const pesan =
      `Halo ${safeName}! 🎉\n\n` +
      `Terima kasih sudah berlangganan *AETHERA Premium* (${sanitise(entry.plan)}).\n\n` +
      `Berikut *License Key* kamu:\n\n` +
      `\`${entry.key}\`\n\n` +
      `Cara aktivasi:\n` +
      `1. Buka aplikasi → menu *Premium*\n` +
      `2. Scroll ke bawah → bagian *Sudah punya License Key?*\n` +
      `3. Paste key di atas → klik *Aktifkan Premium*\n\n` +
      `Berlaku hingga: *${sanitise(entry.exp)}*\n` +
      `Perangkat: *${sanitise(entry.device)}*\n\n` +
      `⚠️ License ini hanya bisa dipakai di perangkat kamu sendiri. Jangan dibagikan ya.\n\n` +
      `Ada pertanyaan? Balas pesan ini 😊`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, "_blank");
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    setAuthed(false);
  };

  if (checking) return null;
  if (!authed) return <AdminLogin onAuth={() => setAuthed(true)} />;

  // ─── Authenticated view ───────────────────────────────────────────────────

  const s: React.CSSProperties & Record<string, unknown> = {};
  void s;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "0 auto", padding: "24px 16px", color: "#f0f2f8" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>👑 AETHERA — Admin Panel</h1>
          <p style={{ fontSize: 13, color: "#9ba3b8", margin: 0 }}>Halaman admin — jangan share URL ini</p>
        </div>
        <button onClick={logout} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2d38", background: "transparent", color: "#9ba3b8", fontSize: 12, cursor: "pointer" }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["generate", "monitor"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "2px solid",
              borderColor: tab === t ? "#f5a623" : "#2a2d38",
              background: tab === t ? "rgba(245,166,35,0.1)" : "#13151b",
              color: tab === t ? "#f5a623" : "#9ba3b8",
            }}
          >
            {t === "generate" ? "🔑 Generate Key" : "📊 Monitor Aktivasi"}
          </button>
        ))}
      </div>

      {/* Generate form */}
      <div style={{ background: "#1a1d24", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #2a2d38" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Generate Key Baru</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#9ba3b8", marginBottom: 6 }}>Nama Usaha / Pembeli *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            placeholder="cth: Warung Bu Sari"
            maxLength={MAX_NAME_LENGTH}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2d38", background: "#13151b", color: "#f0f2f8", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#9ba3b8", marginBottom: 6 }}>
            Device ID Pembeli (untuk kunci 1 perangkat)
          </label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value.slice(0, 64))}
            placeholder="cth: A7K-2Xq-9Fp  (minta dari pembeli)"
            maxLength={64}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2d38", background: "#13151b", color: "#f0f2f8", fontSize: 14, boxSizing: "border-box", fontFamily: "monospace" }}
          />
          <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0", lineHeight: 1.5 }}>
            💡 Pembeli bisa lihat Device ID-nya di menu <strong>Premium</strong>. Jika diisi, license
            hanya aktif di perangkat itu (anti-sharing). Kosongkan untuk license bebas perangkat.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#9ba3b8", marginBottom: 6 }}>Paket</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ADMIN_PLANS.map((p, i) => (
              <button key={i} onClick={() => setPlan(i)} style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${planIdx === i ? "#f5a623" : "#2a2d38"}`, background: planIdx === i ? "rgba(245,166,35,0.1)" : "#13151b", color: planIdx === i ? "#f5a623" : "#9ba3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: planIdx === i ? "#f5a623" : "#6b7280" }}>{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {generateError && (
          <p style={{ color: "#f44336", fontSize: 12, margin: "0 0 10px" }}>⚠️ {generateError}</p>
        )}
        <button disabled={generating} onClick={handleGenerate} style={{ width: "100%", padding: 12, borderRadius: 10, background: "#f5a623", border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: generating ? 0.7 : 1 }}>
          {generating ? "Membuat..." : "⚡ Generate License Key"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: "#1a1d24", borderRadius: 16, padding: 20, marginBottom: 16, border: "2px solid #f5a623" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontWeight: 700, margin: 0, color: "#f5a623" }}>✅ License Key Generated</p>
            <button onClick={() => handleCopy(result)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #f5a623", background: "transparent", color: "#f5a623", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <code style={{ display: "block", background: "#13151b", padding: "10px 12px", borderRadius: 8, fontSize: 12, wordBreak: "break-all", color: "#e2e8f0", lineHeight: 1.6 }}>
            {result}
          </code>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ background: "#1a1d24", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #2a2d38" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Riwayat Sesi Ini</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((entry, i) => (
              <div key={i} style={{ background: "#13151b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{sanitise(entry.name)}</p>
                    <p style={{ fontSize: 12, color: "#9ba3b8", margin: "2px 0 0" }}>{sanitise(entry.plan)} · s/d {sanitise(entry.exp)}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", fontFamily: "monospace" }}>🔒 {sanitise(entry.device)}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{entry.generated}</span>
                </div>
                <code style={{ display: "block", fontSize: 11, color: "#9ba3b8", wordBreak: "break-all", marginBottom: 8 }}>
                  {entry.key}
                </code>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleCopy(entry.key)} style={{ flex: 1, padding: 6, borderRadius: 8, border: "1px solid #2a2d38", background: "transparent", color: "#9ba3b8", fontSize: 12, cursor: "pointer" }}>
                    📋 Copy Key
                  </button>
                  <button onClick={() => handleWhatsApp(entry)} style={{ flex: 1, padding: 6, borderRadius: 8, border: "none", background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    💬 Kirim WA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verify */}
      {tab === "generate" && (
      <div style={{ background: "#1a1d24", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #2a2d38" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>Verifikasi Key</h2>
        <input value={verifyKey} onChange={(e) => setVerify(e.target.value)} placeholder="Paste license key..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2d38", background: "#13151b", color: "#f0f2f8", fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
        <button onClick={handleVerify} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #2a2d38", background: "#2a2d38", color: "#f0f2f8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Verifikasi
        </button>
        {verifyResult && (
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, padding: "10px 12px", borderRadius: 8, background: verifyResult.startsWith("✅") ? "rgba(76,175,80,0.1)" : "rgba(244,67,54,0.1)", color: verifyResult.startsWith("✅") ? "#4caf50" : "#f44336", border: `1px solid ${verifyResult.startsWith("✅") ? "rgba(76,175,80,0.3)" : "rgba(244,67,54,0.3)"}` }}>
            {verifyResult}
          </p>
        )}
      </div>
      )}

      {/* Monitor Tab */}
      {tab === "monitor" && (
        <div>
          {/* Stats header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Total Aktivasi: <span style={{ color: "#f5a623" }}>{monitorTotal}</span></p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>Diperbarui setiap kali tab dibuka</p>
            </div>
            <button onClick={fetchActivations} disabled={monitorLoading} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2a2d38", background: "#2a2d38", color: "#f0f2f8", fontSize: 12, cursor: "pointer" }}>
              {monitorLoading ? "..." : "↻ Refresh"}
            </button>
          </div>

          {monitorError && (
            <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#f44336" }}>
              ⚠️ {monitorError}
            </div>
          )}

          {monitorLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 }}>Memuat data...</div>
          ) : activations.length === 0 && !monitorError ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 }}>
              Belum ada aktivasi tercatat.<br/>
              <span style={{ fontSize: 12 }}>Data akan muncul setelah ada user yang aktifkan license.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activations.map((a, i) => {
                const isExpired = a.expiry !== "Lifetime" && new Date(a.expiry) < new Date();
                return (
                  <div key={i} style={{ background: "#1a1d24", borderRadius: 12, padding: "14px 16px", border: `1px solid ${isExpired ? "rgba(244,67,54,0.3)" : "#2a2d38"}` }}>
                    {/* Row 1: Nama + badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{a.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>
                          Aktivasi: {new Date(a.activatedAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span style={{
                        padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: isExpired ? "rgba(244,67,54,0.15)" : a.expiry === "Lifetime" ? "rgba(168,85,247,0.15)" : "rgba(76,175,80,0.15)",
                        color: isExpired ? "#f44336" : a.expiry === "Lifetime" ? "#c084fc" : "#4caf50",
                      }}>
                        {isExpired ? "EXPIRED" : a.expiry === "Lifetime" ? "LIFETIME" : a.plan.toUpperCase()}
                      </span>
                    </div>

                    {/* Row 2: Detail info */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12 }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>📱 Device ID: </span>
                        <code style={{ color: "#f5a623", fontSize: 11 }}>{a.deviceId}</code>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>🌐 IP: </span>
                        <code style={{ color: "#9ba3b8", fontSize: 11 }}>{a.ip}</code>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>📅 Berlaku: </span>
                        <span style={{ color: "#9ba3b8" }}>{a.expiry === "Lifetime" ? "Selamanya" : new Date(a.expiry).toLocaleDateString("id-ID")}</span>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <span style={{ color: "#6b7280" }}>💻 UA: </span>
                        <span style={{ color: "#6b7280", fontSize: 10 }}>{a.userAgent.slice(0, 60)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Alur */}
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.2)", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 8px", color: "#f5a623" }}>📖 Alur setelah ada yang beli:</p>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#9ba3b8", lineHeight: 2 }}>
          <li>Pembeli kirim pesan WA + <strong>Device ID</strong> mereka (dari menu Premium)</li>
          <li>Konfirmasi pembayaran (transfer / QRIS dll)</li>
          <li>Di sini → isi nama + <strong>Device ID pembeli</strong> → pilih paket → Generate</li>
          <li>Klik <strong style={{ color: "#25d366" }}>Kirim WA</strong> → pesan terisi otomatis → send ke pembeli</li>
          <li>Pembeli buka app → Premium → input key → Aktifkan ✓ (hanya jalan di perangkatnya)</li>
        </ol>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#6b7280" }}>
        AETHERA UMKM — Admin Panel · Sesi aman dan berakhir otomatis
      </p>
    </div>
  );
}
