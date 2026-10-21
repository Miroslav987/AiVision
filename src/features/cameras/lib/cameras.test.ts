// src/features/cameras/lib/cameras.test.ts
import { describe, it, expect, vi } from 'vitest';
import { gridColumns } from '../components/CameraGrid';
import { loadCamerasConfig, getStreamUrls } from './config';

vi.mock('@/shared/config/env', () => ({
  ENV: {
    webrtcUrl: 'http://test:8889',
    hlsUrl: 'http://test:8888'
  }
}));

describe('Cameras Features Logic', () => {
  it('gridColumns calculation', () => {
    expect(gridColumns(1)).toBe(1);
    expect(gridColumns(2)).toBe(2);
    expect(gridColumns(4)).toBe(2);
    expect(gridColumns(5)).toBe(3);
    expect(gridColumns(8)).toBe(3);
  });

  it('getStreamUrls generates correct URLs', () => {
    const urls = getStreamUrls('cam1');
    expect(urls.webrtc).toBe('http://test:8889/cam1/whep');
    expect(urls.hls).toBe('http://test:8888/cam1/index.m3u8');
  });

  it('loadCamerasConfig filters invalid entries', () => {
    const rawData = {
      cameras: [
        { id: 'cam1', name: 'Valid', role: 'hall', analyzeFps: 3, enabled: true },
        { id: 'cam2', name: 'Invalid Role', role: 'invalid_role', analyzeFps: 3, enabled: true }, // Пропустится
        { id: 'cam3' }, // Пропустится
        { id: 'cam4', name: 'Valid Disabled', role: 'kitchen', analyzeFps: 1, enabled: false }
      ]
    };
    
    const res = loadCamerasConfig(rawData);
    expect(res.length).toBe(2);
    expect(res[0].id).toBe('cam1');
    expect(res[1].id).toBe('cam4'); // Выключенные камеры парсятся, но фильтруются позже в экспорте CAMERAS
  });
});