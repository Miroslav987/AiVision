// src/components/video/SourcePicker.tsx
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Camera, FileVideo, Link, Upload, PlayCircle } from 'lucide-react';
import { useVideoStore } from '@/store/videoStore';
import { useVideoSource } from '@/hooks/useVideoSource';
import { useToastStore } from '@/store/toastStore';

export function SourcePicker() {
  // Исправление: достаем значения отдельными селекторами, чтобы избежать бесконечного ре-рендера
  const videoEl = useVideoStore((s) => s.videoEl);
  const sourceType = useVideoStore((s) => s.sourceType);
  const setSourceType = useVideoStore((s) => s.setSourceType);
  const sourceUrl = useVideoStore((s) => s.sourceUrl);
  const setSourceUrl = useVideoStore((s) => s.setSourceUrl);
  const deviceId = useVideoStore((s) => s.deviceId);
  const setDeviceId = useVideoStore((s) => s.setDeviceId);
  const devices = useVideoStore((s) => s.devices);
  const status = useVideoStore((s) => s.status);
  const errorMsg = useVideoStore((s) => s.errorMsg);

  const { addToast } = useToastStore();

  useVideoSource(videoEl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState('');

  useEffect(() => {
    return () => {
      if (sourceUrl && sourceUrl.startsWith('blob:')) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceUrl(URL.createObjectURL(file));
      e.target.value = ''; 
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localUrl.trim()) {
      setSourceUrl(localUrl.trim());
    } else {
      addToast('warning', 'Введите URL потока');
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg flex flex-col gap-3">
      <div className="flex gap-2">
        <button 
          onClick={() => setSourceType('camera')} 
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'camera' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}
          aria-pressed={sourceType === 'camera'}
        >
          <Camera size={16} /> Камера
        </button>
        <button 
          onClick={() => setSourceType('file')} 
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'file' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}
          aria-pressed={sourceType === 'file'}
        >
          <FileVideo size={16} /> Файл
        </button>
        <button 
          onClick={() => setSourceType('url')} 
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'url' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}
          aria-pressed={sourceType === 'url'}
        >
          <Link size={16} /> Поток
        </button>
      </div>

      <div className="flex items-center gap-2">
        {sourceType === 'camera' && (
          <select 
            className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent" 
            value={deviceId || ''} 
            onChange={(e) => setDeviceId(e.target.value)}
          >
            <option value="">Камера по умолчанию</option>
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Камера ${i + 1}`}</option>
            ))}
            {devices.length === 0 && <option value="" disabled>Камеры не найдены</option>}
          </select>
        )}
        {sourceType === 'file' && (
          <div className="flex-1 flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex-1 flex items-center justify-center gap-2 bg-bg-base border border-border-subtle px-3 py-2 rounded text-sm text-text-main hover:border-accent"
            >
              <Upload size={16} /> Выбрать видео
            </button>
          </div>
        )}
        {sourceType === 'url' && (
          <form onSubmit={handleUrlSubmit} className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="URL (mp4, m3u8...)" 
              className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent" 
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
            />
            <button type="submit" className="bg-accent text-white px-3 py-2 rounded flex items-center gap-1 hover:bg-accent/80 transition-colors">
              <PlayCircle size={16} /> Открыть
            </button>
          </form>
        )}
      </div>

      {errorMsg && <div role="alert" className="text-danger text-xs font-medium px-1">⚠️ {errorMsg}</div>}
      {status === 'requesting' && <div className="text-text-muted text-xs px-1">Подключение источника...</div>}
      {sourceType === 'url' && !sourceUrl && (
        <div className="text-text-muted text-xs px-1 mt-1">
          RTSP браузер не воспроизводит: ретранслируйте поток в HLS или WebRTC (например, через MediaMTX).
        </div>
      )}
    </div>
  );
}