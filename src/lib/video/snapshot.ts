// src/lib/video/snapshot.ts
import { InferenceResult, FrameSize } from '@/types/inference';
import { drawResult } from './overlay';

export async function saveSnapshot(
  video: HTMLVideoElement, 
  result: InferenceResult | null, 
  frame: FrameSize | null
): Promise<string | null> {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return 'Видео ещё не готово';
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return 'Не удалось создать контекст рисования';
  }

  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (result && frame) {
      const scaleX = video.videoWidth / frame.width;
      const scaleY = video.videoHeight / frame.height;
      const uiScale = Math.max(1, video.videoWidth / 1000);
      
      drawResult(
        ctx, 
        result, 
        (b) => ({ x: b.x * scaleX, y: b.y * scaleY, w: b.w * scaleX, h: b.h * scaleY }), 
        uiScale
      );
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      return 'Не удалось создать изображение';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiondesk-snapshot-${Date.now()}.png`;
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'SecurityError') {
      return 'Источник не разрешает читать кадры (нет CORS-заголовков)';
    }
    return `Ошибка сохранения: ${e instanceof Error ? e.message : String(e)}`;
  }
}