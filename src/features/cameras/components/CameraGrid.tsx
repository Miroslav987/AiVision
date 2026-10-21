// src/features/cameras/components/CameraGrid.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { CameraTile } from './CameraTile';
import { CAMERAS } from '../lib/config';

export function gridColumns(n: number): number {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  return 3;
}

export function CameraGrid() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (CAMERAS.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-text-muted">
        Нет активных камер. Проверьте конфигурацию в файле config/cameras.json
      </div>
    );
  }

  // Если камера развернута, остальные РАЗМОНТИРУЮТСЯ, чтобы экономить ресурсы сети и декодер
  const visibleCameras = expandedId ? CAMERAS.filter(c => c.id === expandedId) : CAMERAS;
  const cols = expandedId ? 1 : gridColumns(CAMERAS.length);

  const gridClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-4 ${gridClass} h-full content-start p-4`}>
      {visibleCameras.map(cam => (
        <div key={cam.id} className={expandedId ? 'h-[calc(100vh-6rem)]' : 'aspect-video'}>
          <CameraTile 
            camera={cam} 
            expanded={expandedId === cam.id} 
            onToggle={() => setExpandedId(expandedId === cam.id ? null : cam.id)} 
          />
        </div>
      ))}
    </div>
  );
}