// src/hooks/useVideoSource.ts
import { useEffect } from 'react';
import Hls from 'hls.js';
import { useVideoStore } from '@/store/videoStore';
import { useInferenceStore } from '@/store/inferenceStore';

export function useVideoSource(video: HTMLVideoElement | null): void {
  const { sourceType, sourceUrl, deviceId, sourceVersion } = useVideoStore();

  // Эффект 1: Обновление списка камер без запроса разрешений
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        useVideoStore.getState().setDevices(devs.filter((d) => d.kind === 'videoinput'));
      } catch (e) {
        console.warn('Не удалось получить список устройств:', e);
      }
    };

    fetchCameras();
    navigator.mediaDevices.addEventListener('devicechange', fetchCameras);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchCameras);
  }, []);

  // Эффект 2: Управление источником видео
  useEffect(() => {
    if (!video) return;

    useInferenceStore.getState().clearResults();

    let cancelled = false;
    const ac = new AbortController();
    let stream: MediaStream | null = null;
    let hls: Hls | null = null;

    const cleanup = () => {
      cancelled = true;
      ac.abort();
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.removeAttribute('crossorigin');
      video.load();
    };

    const playVideo = async () => {
      try {
        await video.play();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          // Игнорируем прерывание загрузки
          return;
        }
        useVideoStore.getState().setStatus('error', `Ошибка воспроизведения: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
      }
    };

    const setupCamera = async () => {
      try {
        useVideoStore.getState().setStatus('requesting');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Браузер не даёт доступ к камере (нужен HTTPS или localhost)');
        }

        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        stream.getVideoTracks()[0].addEventListener('ended', () => {
          useVideoStore.getState().setStatus('error', 'Камера была отключена');
        }, { signal: ac.signal });

        video.srcObject = stream;
        
        // Обновляем список, так как теперь есть разрешения (появятся названия)
        const devs = await navigator.mediaDevices.enumerateDevices();
        useVideoStore.getState().setDevices(devs.filter((d) => d.kind === 'videoinput'));
        
        playVideo();
      } catch (err: unknown) {
        let msg = 'Неизвестная ошибка камеры';
        if (err instanceof Error || err instanceof DOMException) {
          if (err.name === 'NotAllowedError') msg = 'Нет разрешения на использование камеры';
          else if (err.name === 'NotReadableError') msg = 'Камера занята другим приложением или недоступна';
          else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') msg = 'Камера не найдена';
          else msg = err.message;
        }
        useVideoStore.getState().setStatus('error', msg);
      }
    };

    const setupUrlOrFile = () => {
      if (!sourceUrl) return;
      
      useVideoStore.getState().setStatus('requesting');
      video.crossOrigin = 'anonymous';

      video.addEventListener('error', () => {
        const errCode = video.error?.code;
        let msg = 'Неизвестная ошибка воспроизведения';
        if (errCode === MediaError.MEDIA_ERR_DECODE) msg = 'Формат видео не поддерживается';
        else if (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) msg = 'Не удалось загрузить видео (проверьте URL и CORS)';
        useVideoStore.getState().setStatus('error', msg);
      }, { signal: ac.signal });

      video.addEventListener('loadeddata', () => {
        useVideoStore.getState().setStatus('ready');
        playVideo();
      }, { signal: ac.signal });

      if (sourceUrl.includes('.m3u8')) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = sourceUrl;
        } else if (Hls.isSupported()) {
          hls = new Hls({ maxMaxBufferLength: 30 });
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              useVideoStore.getState().setStatus('error', 'Ошибка HLS-потока (CORS, сеть или формат)');
            }
          });
        } else {
          useVideoStore.getState().setStatus('error', 'HLS не поддерживается в этом браузере');
        }
      } else {
        video.src = sourceUrl;
      }
    };

    if (sourceType === 'camera') {
      setupCamera();
    } else if (sourceUrl) {
      setupUrlOrFile();
    } else {
      useVideoStore.getState().setStatus('idle');
    }

    return cleanup;
  }, [video, sourceType, sourceUrl, deviceId, sourceVersion]);

  // Эффект 3: Синхронизация событий плеера
  useEffect(() => {
    if (!video) return;

    const ac = new AbortController();
    const { signal } = ac;

    const updatePlaying = (playing: boolean) => {
      useVideoStore.getState().setIsPlaying(playing);
      const state = useVideoStore.getState();
      if (playing) {
        state.setStatus('playing');
      } else if (state.status === 'playing') {
        state.setStatus('ready');
      }
    };

    const updateResolution = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        useVideoStore.getState().setResolution({ width: video.videoWidth, height: video.videoHeight });
      } else {
        useVideoStore.getState().setResolution(null);
      }
    };

    video.addEventListener('playing', () => updatePlaying(true), { signal });
    video.addEventListener('pause', () => updatePlaying(false), { signal });
    video.addEventListener('loadedmetadata', updateResolution, { signal });
    video.addEventListener('resize', updateResolution, { signal });
    
    video.addEventListener('emptied', () => {
      useVideoStore.getState().setIsPlaying(false);
      useVideoStore.getState().setResolution(null);
    }, { signal });

    return () => ac.abort();
  }, [video]);
}