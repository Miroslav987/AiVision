import { PreprocessConfig } from '@/types/config';
import { FrameTransform, computeFrameTransform } from './geometry';

export interface PreprocessResult {
  tensorData: Float32Array;
  dims: [number, number, number, number];
  transform: FrameTransform;
}

export class ImagePreprocessor {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private tensorBuffer: Float32Array | null = null;
  private currentW = 0;
  private currentH = 0;

  public process(bitmap: ImageBitmap, config: PreprocessConfig): PreprocessResult {
    const W = config.inputWidth;
    const H = config.inputHeight;
    const area = W * H;

    if (this.currentW !== W || this.currentH !== H) {
      this.canvas = new OffscreenCanvas(W, H);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true, alpha: false }) as OffscreenCanvasRenderingContext2D | null;
      
      if (!this.ctx) {
        throw new Error('Не удалось создать 2D контекст для OffscreenCanvas. Ваш браузер может не поддерживать аппаратное ускорение canvas.');
      }
      
      this.tensorBuffer = new Float32Array(area * 3);
      this.currentW = W;
      this.currentH = H;
    }

    const transform = computeFrameTransform(bitmap.width, bitmap.height, W, H, config.letterbox);

    this.ctx!.fillStyle = 'rgb(114, 114, 114)';
    this.ctx!.fillRect(0, 0, W, H);
    this.ctx!.drawImage(bitmap, transform.padX, transform.padY, transform.drawW, transform.drawH);

    const imageData = this.ctx!.getImageData(0, 0, W, H).data;
    const buffer = this.tensorBuffer!;

    // Настройка параметров нормализации
    let mean = [0, 0, 0];
    let std = [1, 1, 1];
    let div = 255.0;

    if (config.normalization === 'imagenet') {
      mean = [0.485, 0.456, 0.406];
      std = [0.229, 0.224, 0.225];
    } else if (typeof config.normalization === 'object') {
      mean = config.normalization.mean;
      std = config.normalization.std;
    } else if (config.normalization === 'none') {
      div = 1.0;
    }

    const isRGB = config.channels === 'RGB';
    const isNCHW = config.layout === 'NCHW';

    // Однопроходный цикл для максимальной скорости
    for (let i = 0; i < area; i++) {
      const srcIdx = i * 4;
      
      const rVal = imageData[srcIdx] / div;
      const gVal = imageData[srcIdx + 1] / div;
      const bVal = imageData[srcIdx + 2] / div;

      const r = (rVal - mean[0]) / std[0];
      const g = (gVal - mean[1]) / std[1];
      const b = (bVal - mean[2]) / std[2];

      const c0 = isRGB ? r : b;
      const c1 = g;
      const c2 = isRGB ? b : r;

      if (isNCHW) {
        buffer[i] = c0;
        buffer[area + i] = c1;
        buffer[area * 2 + i] = c2;
      } else {
        const dstIdx = i * 3;
        buffer[dstIdx] = c0;
        buffer[dstIdx + 1] = c1;
        buffer[dstIdx + 2] = c2;
      }
    }

    const dims: [number, number, number, number] = isNCHW ? [1, 3, H, W] : [1, H, W, 3];

    return { tensorData: buffer, dims, transform };
  }
}