import type { NextConfig } from 'next';

// COOP/COEP нужны только для многопоточного WASM. Включаются явно: ENABLE_CROSS_ORIGIN_ISOLATION=true
const isolation = process.env.ENABLE_CROSS_ORIGIN_ISOLATION === 'true';

const nextConfig: NextConfig = {
  // Tailwind CSS v4 подключён через Turbopack-лоадер (так его настроил create-next-app). Без этого правила стилей нет.
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  async headers() {
    if (!isolation) return [];
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
      ],
    }];
  },
};

export default nextConfig;