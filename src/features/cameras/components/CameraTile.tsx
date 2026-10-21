// src/features/cameras/components/CameraTile.tsx
"use client";
import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { CameraConfig } from '../lib/config';
import { useCameraStream } from '@/hooks/useCameraStream';

interface CameraTileProps {
  camera: CameraConfig;
  expanded: boolean;
  onToggle: () => void;
}

export function CameraTile({ camera, expanded, onToggle }: CameraTileProps) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const { status, transport, error } = useCameraStream(videoEl, camera.id);

  const statusColors = {
    online: 'bg-success text-white',
    connecting: 'bg-warning text-white',
    offline: 'bg-danger text-white'
  };

  const statusLabels = {
    online: 'Online',
    connecting: 'Подключение...',
    offline: 'Offline'
  };

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden group border border-border-subtle">
      <video 
        ref={setVideoEl} 
        muted 
        playsInline 
        autoPlay 
        className="absolute inset-0 w-full h-full object-contain"
      />
      
      {/* <!-- МЕСТО ДЛЯ CANVAS OVERLAY (ЭТАП 9) --> */}

      {status === 'offline' && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 p-4">
          <span className="text-danger text-sm font-medium text-center">{error}</span>
        </div>
      )}

      {/* Верхняя панель (градиент) */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex flex-col gap-1">
          <span className="text-white font-medium text-sm drop-shadow-md">{camera.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
            {transport && status === 'online' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-bg-surface text-text-muted border border-border-subtle">
                {transport}
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={onToggle}
          className="p-1.5 bg-black/50 hover:bg-accent rounded-lg text-white transition-colors backdrop-blur"
          title={expanded ? "Свернуть" : "На весь экран"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}