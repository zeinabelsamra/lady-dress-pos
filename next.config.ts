import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Item photos are uploaded through a Server Action (default limit is 1MB)
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
