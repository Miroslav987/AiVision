import type { BoundingBox } from '@/types/inference';

/** Как кадр уложен во вход модели. Обратное преобразование: frameX = (modelX - padX) / scaleX. */
export interface FrameTransform {
  scaleX: number;
  scaleY: number;
  padX: number;
  padY: number;
  drawW: number;
  drawH: number;
}

export function computeFrameTransform(
  frameW: number, frameH: number, inputW: number, inputH: number, letterbox: boolean,
): FrameTransform {
  if (letterbox) {
    const s = Math.min(inputW / frameW, inputH / frameH);
    const drawW = Math.round(frameW * s);
    const drawH = Math.round(frameH * s);
    // Масштаб считаем от реально нарисованного (округлённого) размера, иначе рамки сдвигаются на доли пикселя
    return { scaleX: drawW / frameW, scaleY: drawH / frameH, padX: (inputW - drawW) / 2, padY: (inputH - drawH) / 2, drawW, drawH };
  }
  return { scaleX: inputW / frameW, scaleY: inputH / frameH, padX: 0, padY: 0, drawW: inputW, drawH: inputH };
}

/** Рамка в координатах входа модели (cx, cy, w, h) → рамка в пикселях исходного кадра. */
export function modelBoxToFrame(cx: number, cy: number, w: number, h: number, t: FrameTransform): BoundingBox {
  return {
    x: (cx - w / 2 - t.padX) / t.scaleX,
    y: (cy - h / 2 - t.padY) / t.scaleY,
    w: w / t.scaleX,
    h: h / t.scaleY,
  };
}

/** Где на экране находится картинка видео при object-fit: contain внутри контейнера. */
export interface ContainRect {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeContainRect(containerW: number, containerH: number, mediaW: number, mediaH: number): ContainRect {
  const scale = Math.min(containerW / mediaW, containerH / mediaH);
  return { scale, offsetX: (containerW - mediaW * scale) / 2, offsetY: (containerH - mediaH * scale) / 2 };
}