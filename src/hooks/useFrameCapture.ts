import { useEffect, useRef } from 'react';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

type ProcessFrameFn = (bitmap: ImageBitmap) => Promise<void>;

export function useFrameCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  processFrame: ProcessFrameFn,
  isActive: boolean
) {
  const { maxFps } = useModelStore((s) => s.config);
  const setFpsVideo = useInferenceStore((s) => s.setFpsVideo);
  
  const isProcessingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    let stopped = false;

    const captureLoop = async (now: number) => {
      if (stopped) return;

      // Считаем FPS видео
      frameTimesRef.current.push(now);
      const oneSecAgo = now - 1000;
      frameTimesRef.current = frameTimesRef.current.filter((t) => t > oneSecAgo);
      setFpsVideo(frameTimesRef.current.length);

      const timeSinceLast = now - lastTimeRef.current;
      const minInterval = 1000 / maxFps;

      // Если воркер занят или не прошло нужное время (ограничение FPS)
      if (isProcessingRef.current || timeSinceLast < minInterval) {
        scheduleNext();
        return;
      }

      // Проверяем готовность видео
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          isProcessingRef.current = true;
          lastTimeRef.current = now;
          
          // Создаем ImageBitmap для zero-copy transfer в Worker
          const bitmap = await createImageBitmap(video);
          
          // ВАЖНО: Мы не ждём ответа, чтобы не блокировать цикл захвата.
          // Внутри processFrame воркер ответит асинхронно, а пока isProcessingRef = true, кадры сбрасываются.
          processFrame(bitmap).finally(() => {
            isProcessingRef.current = false;
          });
        } catch (e) {
          console.error('Ошибка создания ImageBitmap:', e);
          isProcessingRef.current = false;
        }
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      if (stopped) return;
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        requestRef.current = video.requestVideoFrameCallback((_now, metadata) => captureLoop(metadata.expectedDisplayTime));
      } else {
        requestRef.current = requestAnimationFrame((now) => captureLoop(now));
      }
    };

    scheduleNext();

    return () => {
      stopped = true;
      if (requestRef.current !== null) {
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
          video.cancelVideoFrameCallback(requestRef.current);
        } else {
          cancelAnimationFrame(requestRef.current);
        }
      }
    };
  }, [isActive, maxFps, videoRef, processFrame, setFpsVideo]);
}