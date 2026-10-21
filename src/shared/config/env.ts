// src/shared/config/env.ts
export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.warn(`Отсутствует переменная окружения: ${name}`);
    return '';
  }
  return val;
}

export const ENV = {
  webrtcUrl: requireEnv('NEXT_PUBLIC_MEDIAMTX_WEBRTC_URL'),
  hlsUrl: requireEnv('NEXT_PUBLIC_MEDIAMTX_HLS_URL'),
};