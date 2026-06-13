import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next 16. sql.js loads its WASM build
  // from /public at runtime, so no special module aliasing is required here.
  turbopack: {},
};

export default nextConfig;
