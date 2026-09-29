import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/exercises/**/*": ["./data/powercoach/seed/exercises*.json"],
    "/api/auth/athlete-accept-invite": ["./data/powercoach/seed/exercises*.json"],
  },
};

export default nextConfig;
