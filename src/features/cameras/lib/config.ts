// src/features/cameras/lib/config.ts
import camerasData from '../../../../config/cameras.json';

import { ENV } from '@/shared/config/env';

export interface CameraConfig {
  id: string;
  name: string;
  role: 'hall' | 'entrance' | 'kitchen' | 'pass' | 'bar';
  analyzeFps: number;
  enabled: boolean;
}

export function isCameraConfig(val: any): val is CameraConfig {
  return typeof val === 'object' && val !== null &&
         typeof val.id === 'string' &&
         typeof val.name === 'string' &&
         ['hall', 'entrance', 'kitchen', 'pass', 'bar'].includes(val.role) &&
         typeof val.analyzeFps === 'number' &&
         typeof val.enabled === 'boolean';
}

export function loadCamerasConfig(raw: unknown): CameraConfig[] {
  if (!raw || typeof raw !== 'object' || !('cameras' in raw) || !Array.isArray((raw as any).cameras)) {
    console.warn('Неверная структура config/cameras.json');
    return [];
  }
  const valid: CameraConfig[] = [];
  for (const item of (raw as any).cameras) {
    if (isCameraConfig(item)) {
      valid.push(item);
    } else {
      console.warn('Пропущена невалидная запись камеры:', item);
    }
  }
  return valid;
}

export const CAMERAS = loadCamerasConfig(camerasData).filter(c => c.enabled);

export function getStreamUrls(id: string): { webrtc: string; hls: string } {
  return {
    webrtc: `${ENV.webrtcUrl}/${id}/whep`,
    hls: `${ENV.hlsUrl}/${id}/index.m3u8`
  };
}