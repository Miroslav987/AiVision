// src/features/cameras/CamerasPage.tsx
"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/shared/Header'; // Извините, AppHeader не было в snapshot, использую Header

const CameraGridWrap = dynamic(() => import('./components/CameraGrid').then(m => m.CameraGrid), { ssr: false });

export function CamerasPage() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg-base">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <CameraGridWrap />
      </main>
    </div>
  );
}