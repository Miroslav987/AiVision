// src/lib/video/overlay.ts
import { BoundingBox, InferenceResult, FrameSize } from '@/types/inference';
import { ContainRect, computeContainRect } from '../inference/geometry';

export function classColor(classId: number): string {
  return `hsl(${(classId * 137.508) % 360}, 75%, 50%)`;
}

export function frameBoxToScreen(
  b: BoundingBox, 
  fit: ContainRect, 
  videoW: number, 
  videoH: number, 
  frame: FrameSize
): BoundingBox {
  const kx = (videoW / frame.width) * fit.scale;
  const ky = (videoH / frame.height) * fit.scale;
  return { 
    x: fit.offsetX + b.x * kx, 
    y: fit.offsetY + b.y * ky, 
    w: b.w * kx, 
    h: b.h * ky 
  };
}

export function drawResult(
  ctx: CanvasRenderingContext2D, 
  result: InferenceResult, 
  mapBox: (b: BoundingBox) => BoundingBox, 
  uiScale = 1
): void {
  if (result.type === 'raw') return;

  if (result.type === 'classification') {
    const padding = 16 * uiScale;
    const lineHeight = 24 * uiScale;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(padding, padding, 200 * uiScale, 10 * uiScale + result.data.length * lineHeight);
    ctx.font = `${14 * uiScale}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    
    result.data.forEach((cls, i) => {
      ctx.fillStyle = classColor(cls.classId);
      ctx.fillText(
        `${cls.className}: ${(cls.confidence * 100).toFixed(2)}%`, 
        padding + 10 * uiScale, 
        padding + 10 * uiScale + i * lineHeight
      );
    });
    return;
  }

  // detection
  ctx.lineWidth = 2 * uiScale;
  ctx.font = `${12 * uiScale}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  for (const d of result.data) {
    const box = mapBox(d.box);
    const color = classColor(d.classId);
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    
    const label = `${d.className} ${d.confidence.toFixed(2)}`;
    const tw = ctx.measureText(label).width;
    const th = 18 * uiScale;
    
    // Если сверху рамки нет места (вылезает за экран), рисуем внутри
    const labelY = box.y - th >= 0 ? box.y - th : box.y;
    
    ctx.fillRect(box.x, labelY, tw + 8 * uiScale, th);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, box.x + 4 * uiScale, labelY + 2 * uiScale);
  }
}

export function drawOverlay(
  canvas: HTMLCanvasElement, 
  video: HTMLVideoElement, 
  result: InferenceResult | null, 
  frame: FrameSize | null
): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  const bw = Math.max(1, Math.round(rect.width * dpr));
  const bh = Math.max(1, Math.round(rect.height * dpr));
  
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bw, bh);

  if (!result || !frame || video.videoWidth === 0 || video.videoHeight === 0 || rect.width === 0 || rect.height === 0) {
    return;
  }

  ctx.setTransform(bw / rect.width, 0, 0, bh / rect.height, 0, 0);
  
  const fit = computeContainRect(rect.width, rect.height, video.videoWidth, video.videoHeight);
  
  drawResult(ctx, result, (b) => frameBoxToScreen(b, fit, video.videoWidth, video.videoHeight, frame));
}