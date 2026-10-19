import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    // Включаем изоляцию только если это явно запрошено (для многопоточного WASM)
    if (process.env.ENABLE_CROSS_ORIGIN_ISOLATION === 'true') {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          ],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;