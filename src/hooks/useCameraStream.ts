// src/features/cameras/hooks/useCameraStream.ts
import { useState, useEffect } from 'react';
import Hls from 'hls.js';
import { getStreamUrls } from '../lib/config';
import { connectWhep } from '../lib/whep';

interface StreamState {
  status: 'connecting' | 'online' | 'offline';
  transport: 'webrtc' | 'hls' | null;
  error: string | null;
}

export function useCameraStream(video: HTMLVideoElement | null, cameraId: string): StreamState {
  const [state, setState] = useState<StreamState>({ status: 'connecting', transport: null, error: null });

  useEffect(() => {
    if (!video || !cameraId) return;

    let aborted = false;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let webrtcClose: (() => void) | null = null;
    let hls: Hls | null = null;
    let retryDelay = 1000;

    const cleanup = () => {
      if (webrtcClose) { webrtcClose(); webrtcClose = null; }
      if (hls) { hls.destroy(); hls = null; }
      video.srcObject = null;
      video.removeAttribute('src');
    };

    const scheduleRetry = () => {
      if (aborted) return;
      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(connectWebRTC, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    };

    const tryHls = (hlsUrl: string) => {
      if (aborted) return;
      cleanup();
      setState({ status: 'connecting', transport: 'hls', error: null });

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = hlsUrl;
        video.addEventListener('loadeddata', () => {
          if (!aborted) { retryDelay = 1000; setState({ status: 'online', transport: 'hls', error: null }); }
        }, { once: true });
        video.addEventListener('error', () => {
          if (!aborted) { setState({ status: 'offline', transport: 'hls', error: 'Ошибка загрузки HLS' }); scheduleRetry(); }
        }, { once: true });
      } else if (Hls.isSupported()) {
        hls = new Hls({ maxMaxBufferLength: 30 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!aborted) { retryDelay = 1000; setState({ status: 'online', transport: 'hls', error: null }); video.play().catch(() => {}); }
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal && !aborted) {
            setState({ status: 'offline', transport: 'hls', error: 'Фатальная ошибка HLS' });
            scheduleRetry();
          }
        });
      } else {
        setState({ status: 'offline', transport: null, error: 'HLS не поддерживается' });
        scheduleRetry();
      }
    };

    const connectWebRTC = async () => {
      if (aborted) return;
      cleanup();
      setState({ status: 'connecting', transport: 'webrtc', error: null });
      
      const urls = getStreamUrls(cameraId);
      const ac = new AbortController();

      try {
        const { pc, close } = await connectWhep(video, urls.webrtc, ac.signal);
        webrtcClose = close;

        pc.addEventListener('connectionstatechange', () => {
          if (aborted) return;
          if (pc.connectionState === 'connected') {
            retryDelay = 1000;
            setState({ status: 'online', transport: 'webrtc', error: null });
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            tryHls(urls.hls);
          }
        });
      } catch (e) {
        if (!aborted) tryHls(urls.hls);
      }
    };

    connectWebRTC();

    return () => {
      aborted = true;
      clearTimeout(retryTimeout);
      cleanup();
    };
  }, [video, cameraId]);

  return state;
}