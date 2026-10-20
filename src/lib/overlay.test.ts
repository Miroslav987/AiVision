// src/lib/video/overlay.test.ts
import { describe, it, expect } from 'vitest';
import { computeContainRect } from './inference/geometry';
import { frameBoxToScreen } from './video/overlay';

describe('Overlay Geometry', () => {
  it('computes contain rect correctly', () => {
    const fit = computeContainRect(800, 600, 1280, 720);
    // scale = min(800/1280, 600/720) = min(0.625, 0.8333) = 0.625
    expect(fit.scale).toBeCloseTo(0.625);
    // offsetX = (800 - 1280 * 0.625) / 2 = (800 - 800) / 2 = 0
    expect(fit.offsetX).toBeCloseTo(0);
    // offsetY = (600 - 720 * 0.625) / 2 = (600 - 450) / 2 = 75
    expect(fit.offsetY).toBeCloseTo(75);
  });

  it('maps frame box to screen coordinates', () => {
    const fit = { scale: 0.625, offsetX: 0, offsetY: 75 };
    const box = { x: 400, y: 200, w: 400, h: 300 };
    const frame = { width: 1280, height: 720 };
    
    // kx = (1280 / 1280) * 0.625 = 0.625
    // ky = (720 / 720) * 0.625 = 0.625
    // x = 0 + 400 * 0.625 = 250
    // y = 75 + 200 * 0.625 = 200
    // w = 400 * 0.625 = 250
    // h = 300 * 0.625 = 187.5
    
    const mapped = frameBoxToScreen(box, fit, 1280, 720, frame);
    expect(mapped.x).toBeCloseTo(250);
    expect(mapped.y).toBeCloseTo(200);
    expect(mapped.w).toBeCloseTo(250);
    expect(mapped.h).toBeCloseTo(187.5);
  });

  it('maps correctly when frame size differs from video size', () => {
    const fit = { scale: 0.625, offsetX: 0, offsetY: 75 };
    const box = { x: 200, y: 100, w: 200, h: 150 };
    const frame = { width: 640, height: 360 };
    
    // kx = (1280 / 640) * 0.625 = 1.25
    // ky = (720 / 360) * 0.625 = 1.25
    // x = 0 + 200 * 1.25 = 250
    // y = 75 + 100 * 1.25 = 200
    // w = 200 * 1.25 = 250
    // h = 150 * 1.25 = 187.5
    
    const mapped = frameBoxToScreen(box, fit, 1280, 720, frame);
    expect(mapped.x).toBeCloseTo(250);
    expect(mapped.y).toBeCloseTo(200);
    expect(mapped.w).toBeCloseTo(250);
    expect(mapped.h).toBeCloseTo(187.5);
  });
});