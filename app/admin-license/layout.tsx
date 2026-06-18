// Halaman admin — tidak pakai layout app (tanpa sidebar/bottomnav)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#0d0f14" }}>
      {children}
    </div>
  );
}
