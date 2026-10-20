// src/hooks/useVideoSource.ts
import { useEffect, useState, RefObject } from 'react';
import Hls from 'hls.js';
import { useVideoStore } from '@/store/videoStore';

type Status = 'idle' | 'requesting' | 'ready' | 'playing' | 'error';

export function useVideoSource(videoRef: RefObject<HTMLVideoElement | null>) {
  const { sourceType, sourceUrl, deviceId, setIsPlaying, setResolution } = useVideoStore();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Получение списка камер (с запросом прав, если имена скрыты)
  const fetchCameras = async () => {
    try {
      let devs = await navigator.mediaDevices.enumerateDevices();
      let videoDevs = devs.filter((d) => d.kind === 'videoinput');
      
      // Если метки пустые, значит нет разрешения. Запрашиваем временное.
      if (videoDevs.length > 0 && !videoDevs[0].label) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        devs = await navigator.mediaDevices.enumerateDevices();
        videoDevs = devs.filter((d) => d.kind === 'videoinput');
        stream.getTracks().forEach((t) => t.stop()); // Сразу закрываем
      }
      setDevices(videoDevs);
    } catch (e) {
      console.warn('Не удалось получить список устройств:', e);
    }
  };

  useEffect(() => {
    window.setTimeout(fetchCameras, 0);
    navigator.mediaDevices.addEventListener('devicechange', fetchCameras);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchCameras);
  }, []);

  // Основная логика переключения источников
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let stream: MediaStream | null = null;

    const cleanup = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (video.srcObject) video.srcObject = null;
      video.removeAttribute('src');
      video.load();
      setStatus('idle');
      setErrorMsg(null);
    };

    const setupCamera = async () => {
      try {
        setStatus('requesting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        });
        
        // Обработка физического отключения камеры
        stream.getVideoTracks()[0].onended = () => {
          setErrorMsg('Камера была отключена');
          setStatus('error');
          setIsPlaying(false);
        };

        video.srcObject = stream;
        video.crossOrigin = 'anonymous';
        await video.play();
        setStatus('playing');
      } catch (err: unknown) {
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') setErrorMsg('Нет разрешения на использование камеры');
          else if (err.name === 'NotReadableError') setErrorMsg('Камера занята другим приложением или недоступна');
          else setErrorMsg(`Ошибка камеры: ${err.message}`);
        } else {
          setErrorMsg('Неизвестная ошибка камеры');
        }
        setStatus('error');
      }
    };

    const setupUrlOrFile = async () => {
      if (!sourceUrl) return;
      setStatus('requesting');
      video.crossOrigin = 'anonymous'; // Критично для Canvas и Web Worker

      if (sourceUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          hls = new Hls({ maxMaxBufferLength: 30 }); // Снижаем буферизацию для live
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStatus('ready');
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setErrorMsg('Ошибка воспроизведения HLS (возможно, проблема с CORS или форматом)');
              setStatus('error');
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native Safari
          video.src = sourceUrl;
          video.addEventListener('loadedmetadata', () => setStatus('ready'), { once: true });
        } else {
          setErrorMsg('HLS не поддерживается в этом браузере');
          setStatus('error');
        }
      } else {
        // Обычный файл или URL
        video.src = sourceUrl;
        video.onerror = () => {
          const err = video.error;
          if (err?.code === MediaError.MEDIA_ERR_DECODE) setErrorMsg('Формат видео не поддерживается');
          else if (err?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) setErrorMsg('Не удалось загрузить видео (проверьте URL и CORS)');
          else setErrorMsg('Неизвестная ошибка воспроизведения');
          setStatus('error');
        };
        video.addEventListener('canplay', () => setStatus('ready'), { once: true });
      }
    };

    cleanup();

    if (sourceType === 'camera') setupCamera();
    else if ((sourceType === 'file' || sourceType === 'url') && sourceUrl) setupUrlOrFile();

    return cleanup;
  }, [sourceType, sourceUrl, deviceId, videoRef, setIsPlaying]);

  // Синхронизация статусов с Zustand
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => { setStatus('playing'); setIsPlaying(true); };
    const onPause = () => { setStatus('ready'); setIsPlaying(false); };
    const onResize = () => setResolution({ width: video.videoWidth, height: video.videoHeight });

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('resize', onResize);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('resize', onResize);
    };
  }, [videoRef, setIsPlaying, setResolution]);

  return { status, errorMsg, devices };
}