// src/hooks/useFrameCapture.ts
import { useEffect } from 'react';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

export function useFrameCapture(
  video: HTMLVideoElement | null,
  processFrame: (bitmap: ImageBitmap) => Promise<void>,
  active: boolean
): void {
  useEffect(() => {
    if (!video || !active) return;

    let stopped = false;
    let requestRef: number;
    let lastTime = 0;
    let frames = 0;
    let lastFpsTime = performance.now();
    let busy = false;

    const setFpsVideo = useInferenceStore.getState().setFpsVideo;

    const loop = async (now: number) => {
      if (stopped) return;

      frames++;
      if (now - lastFpsTime >= 1000) {
        setFpsVideo(Math.round((frames * 1000) / (now - lastFpsTime)));
        frames = 0;
        lastFpsTime = now;
      }

      const maxFps = useModelStore.getState().config.maxFps;
      const interval = 1000 / maxFps;

      if (!busy && (now - lastTime >= interval) && video.readyState >= 2 && video.videoWidth > 0) {
        busy = true;
        lastTime = now;
        try {
          const bitmap = await createImageBitmap(video);
          if (stopped) {
            bitmap.close();
          } else {
            await processFrame(bitmap);
          }
        } catch (e) {
          console.error(e);
        } finally {
          busy = false;
        }
      }

      schedule();
    };

    const schedule = () => {
      if (stopped) return;
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        requestRef = (video as any).requestVideoFrameCallback((now: number, meta: any) => loop(meta.expectedDisplayTime));
      } else {
        requestRef = requestAnimationFrame(loop);
      }
    };

    schedule();

    return () => {
      stopped = true;
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        (video as any).cancelVideoFrameCallback(requestRef);
      } else {
        cancelAnimationFrame(requestRef);
      }
      setFpsVideo(0);
    };
  }, [video, processFrame, active]);
}