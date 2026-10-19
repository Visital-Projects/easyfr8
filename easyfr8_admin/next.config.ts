import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

// Trigger Next.js reload to refresh connection pool
export default nextConfig;
