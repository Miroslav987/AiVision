// src/components/model/ModelDropzone.tsx
"use client";
import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useModelStore } from '@/store/modelStore';
import { handleModelFiles } from '@/lib/inference/modelLoader';

export function ModelDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const loading = useModelStore((s) => s.loading);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    handleModelFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); 
    setIsDragging(false); 
    if (!loading) processFiles(e.dataTransfer.files);
  };

  if (loading) {
    return (
      <div className="border-2 border-accent border-dashed rounded-xl p-6 text-center bg-accent/5 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <div className="text-sm font-medium text-text-main">{loading.message}</div>
        <div className="w-full max-w-[200px] h-1 bg-border-subtle rounded-full overflow-hidden mt-1">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${loading.progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center gap-3 ${
        isDragging ? 'border-accent bg-accent/10' : 'border-border-subtle bg-bg-surface hover:border-text-muted/50'
      }`}
    >
      <div className="flex items-center gap-2 text-text-muted"><UploadCloud size={32} /></div>
      <div>
        <p className="text-sm font-medium text-text-main">Перетащите файлы модели сюда</p>
        <p className="text-xs text-text-muted mt-1 max-w-xs">.onnx + метки (.txt / .json) + конфигурация (.json)</p>
      </div>
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 bg-bg-base border border-border-subtle text-text-main text-xs px-4 py-2 rounded hover:border-accent transition-colors"
      >
        Выбрать файлы
      </button>
      <input 
        type="file" 
        multiple 
        ref={fileInputRef}
        accept=".onnx,.txt,.json"
        className="hidden" 
        onChange={(e) => processFiles(e.target.files)} 
      />
    </div>
  );
}