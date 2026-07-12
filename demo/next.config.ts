import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
};

export default config;
