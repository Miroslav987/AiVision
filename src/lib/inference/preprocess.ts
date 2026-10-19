import { PreprocessConfig } from '@/types/config';

export interface PreprocessResult {
  tensorData: Float32Array;
  padX: number;
  padY: number;
  scale: number;
}

export class ImagePreprocessor {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private tensorBuffer: Float32Array | null = null;
  private lastConfigStr: string = '';

  public process(bitmap: ImageBitmap, config: PreprocessConfig): PreprocessResult {
    const { inputWidth, inputHeight, layout, channels, normalization, letterbox } = config;
    const configStr = `${inputWidth}x${inputHeight}-${layout}-${channels}-${JSON.stringify(normalization)}`;

    // 1. Инициализация/ресайз буферов при изменении конфига
    if (!this.canvas || this.canvas.width !== inputWidth || this.canvas.height !== inputHeight) {
      this.canvas = new OffscreenCanvas(inputWidth, inputHeight);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true, alpha: false }) as OffscreenCanvasRenderingContext2D;
    }
    
    if (!this.tensorBuffer || this.lastConfigStr !== configStr) {
      this.tensorBuffer = new Float32Array(1 * 3 * inputWidth * inputHeight);
      this.lastConfigStr = configStr;
    }

    // 2. Расчет масштаба и отступов (Letterbox vs Resize)
    let scale = 1.0;
    let padX = 0;
    let padY = 0;
    let drawW = inputWidth;
    let drawH = inputHeight;

    if (letterbox) {
      scale = Math.min(inputWidth / bitmap.width, inputHeight / bitmap.height);
      drawW = Math.round(bitmap.width * scale);
      drawH = Math.round(bitmap.height * scale);
      padX = (inputWidth - drawW) / 2;
      padY = (inputHeight - drawH) / 2;
    } else {
      scale = inputWidth / bitmap.width; // Упрощенно для resize по X (для обратного пересчета X)
      // При простом resize padX/padY = 0, но по осям разный скейл. 
      // В классическом CV при resize без сохранения пропорций обратный пересчет требует scaleX и scaleY.
      // Для простоты контракта вернем scale по X, а в декодере это нужно учитывать (оставим scaleX = scale, scaleY = inputHeight / bitmap.height).
    }

    // 3. Отрисовка на OffscreenCanvas
    this.ctx!.fillStyle = '#000000';
    this.ctx!.fillRect(0, 0, inputWidth, inputHeight);
    this.ctx!.drawImage(bitmap, padX, padY, drawW, drawH);

    // 4. Извлечение пикселей и нормализация
    const imageData = this.ctx!.getImageData(0, 0, inputWidth, inputHeight).data;
    const buffer = this.tensorBuffer;
    const area = inputWidth * inputHeight;

    // Параметры нормализации
    let mean = [0, 0, 0];
    let std = [1, 1, 1];
    let div = 255.0;

    if (normalization === 'imagenet') {
      mean = [0.485, 0.456, 0.406];
      std = [0.229, 0.224, 0.225];
    } else if (typeof normalization === 'object') {
      mean = normalization.mean;
      std = normalization.std;
    } else if (normalization === 'none') {
      div = 1.0;
    }

    // 5. Заполнение буфера (Single Pass)
    const isRGB = channels === 'RGB';
    const isNCHW = layout === 'NCHW';

    for (let i = 0; i < area; i++) {
      const srcIdx = i * 4;
      const r = (imageData[srcIdx] / div - mean[0]) / std[0];
      const g = (imageData[srcIdx + 1] / div - mean[1]) / std[1];
      const b = (imageData[srcIdx + 2] / div - mean[2]) / std[2];

      const c0 = isRGB ? r : b;
      const c1 = g;
      const c2 = isRGB ? b : r;

      if (isNCHW) {
        buffer[i] = c0;
        buffer[area + i] = c1;
        buffer[area * 2 + i] = c2;
      } else { // NHWC
        const dstIdx = i * 3;
        buffer[dstIdx] = c0;
        buffer[dstIdx + 1] = c1;
        buffer[dstIdx + 2] = c2;
      }
    }

    return { tensorData: buffer, padX, padY, scale: letterbox ? scale : (inputWidth / bitmap.width) };
  }
}