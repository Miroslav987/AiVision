"use client";

import React, { useRef, useEffect } from 'react';
import { Camera, FileVideo, Link, Upload } from 'lucide-react';
import { useVideoStore } from '@/store/videoStore';
import { useVideoSource } from '@/hooks/useVideoSource';

export function SourcePicker({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const { sourceType, setSourceType, sourceUrl, setSourceUrl, setDeviceId, deviceId } = useVideoStore();
  const { devices, errorMsg, status } = useVideoSource(videoRef);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Исправление 1: Очистка ObjectURL при размонтировании или смене
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
      if (sourceUrl && sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg flex flex-col gap-3">
      <div className="flex gap-2">
        <button onClick={() => setSourceType('camera')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'camera' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}><Camera size={16} /> Камера</button>
        <button onClick={() => setSourceType('file')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'file' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}><FileVideo size={16} /> Файл</button>
        <button onClick={() => setSourceType('url')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${sourceType === 'url' ? 'bg-accent text-white' : 'bg-bg-base text-text-muted hover:text-text-main'}`}><Link size={16} /> Поток</button>
      </div>

      <div className="flex items-center gap-2">
        {sourceType === 'camera' && (
          <select className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent" value={deviceId || ''} onChange={(e) => setDeviceId(e.target.value)}>
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Неизвестная камера'}</option>)}
            {devices.length === 0 && <option value="">Камеры не найдены</option>}
          </select>
        )}
        {sourceType === 'file' && (
          <div className="flex-1 flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="video/mp4,video/webm,video/quicktime" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-bg-base border border-border-subtle px-3 py-2 rounded text-sm text-text-main hover:border-accent"><Upload size={16} /> Выбрать видео</button>
          </div>
        )}
        {sourceType === 'url' && (
          <input type="text" placeholder="URL (mp4, m3u8...)" className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent" onBlur={(e) => setSourceUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSourceUrl((e.target as HTMLInputElement).value)} />
        )}
      </div>

      {errorMsg && <div className="text-danger text-xs font-medium px-1">⚠️ {errorMsg}</div>}
      {status === 'requesting' && <div className="text-text-muted text-xs px-1">Загрузка источника...</div>}
    </div>
  );
}