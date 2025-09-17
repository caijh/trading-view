import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    async rewrites() {
        return [
            {
                source: '/api/trading-plus/:path*',
                destination: 'https://gateway.joinspace.pp.ua/trading-plus/strategy/:path*',
            },
            {
                source: '/api/trading-data/:path*',
                destination: 'https://gateway.joinspace.pp.ua/trading-data/:path*',
            }
        ];
    },
};

export default nextConfig;
