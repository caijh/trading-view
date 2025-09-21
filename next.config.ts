import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '127.0.0.1'],
  /* config options here */
    async rewrites() {
        return [
            {
                source: '/api/trading-plus/:path*',
                destination: 'https://gateway.joinspace.pp.ua/trading-plus/:path*',
            },
            {
                source: '/api/trading-data/:path*',
                destination: 'https://gateway.joinspace.pp.ua/trading-data/:path*',
            }
        ];
    },
};

export default nextConfig;
