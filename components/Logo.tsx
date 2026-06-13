export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AETHERA UMKM"
    >
      <defs>
        <linearGradient id="aethera-grad" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#F5A623" />
          <stop offset="1" stopColor="#FF8C42" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#1C2030" />
      <path
        d="M32 14 L46 46 H39 L32 28 L25 46 H18 Z"
        fill="url(#aethera-grad)"
      />
      <circle cx="32" cy="40" r="3.5" fill="#4FC3F7" />
    </svg>
  );
}
