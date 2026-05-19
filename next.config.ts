import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '127.0.0.1'],
  /* config options here */
    async rewrites() {
        return [
            {
                source: '/api/trading-plus/:path*',
                destination: 'https://junhuitsai-trading-plus-ai.hf.space/:path*',
            },
            {
                source: '/api/trading-data/:path*',
                destination: 'http://138.3.211.91/trading-data/:path*',
            }
        ];
    },
};

export default nextConfig;
