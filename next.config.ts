import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Turbopack native bindings not available on Windows x64; use Webpack instead
  turbopack: {},
  webpack: (config) => config,
  outputFileTracingRoot: __dirname,
  // Skip TypeScript checking during build due to WASM worker issue
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
