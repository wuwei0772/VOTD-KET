import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: 'image.pollinations.ai' }],
  },
};

export default nextConfig;
