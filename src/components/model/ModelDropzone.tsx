"use client";
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileJson, FileBinary } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { useModelStore } from '@/store/modelStore';
import { getGlobalInferenceClient } from '@/lib/inference/clientSingleton';
import { ModelFormat } from '@/types/inference';

export function ModelDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const { addToast } = useToastStore();
  const { setActiveModel, config } = useModelStore();

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const onnxFile = fileArray.find(f => f.name.endsWith('.onnx'));
    let format: ModelFormat = 'unsupported';
    let url = '';

    if (onnxFile) {
      format = 'onnx';
      url = URL.createObjectURL(onnxFile);
    } else {
      addToast('error', 'Пока поддерживается только загрузка .onnx моделей.');
      return;
    }

    try {
      setIsUploading(true);
      const client = getGlobalInferenceClient();
      client.onProgress = (p, msg) => setProgressMsg(`${p}% - ${msg}`);
      
      const info = await client.load(url, format, config);
      setActiveModel(info.id, info);
      addToast('success', `Модель ${info.name} успешно загружена и готова к инференсу!`);
    } catch (e) {
      addToast('error', `Ошибка загрузки модели: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsUploading(false);
      setProgressMsg('');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files);
  }, []);

  if (isUploading) {
    return (
      <div className="border-2 border-accent border-dashed rounded-xl p-6 text-center bg-accent/5 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-medium text-text-main">{progressMsg || 'Загрузка...'}</div>
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
        <p className="text-xs text-text-muted mt-1 max-w-xs">Поддерживается: .onnx</p>
      </div>
      <label className="mt-2 bg-bg-base border border-border-subtle text-text-main text-xs px-4 py-2 rounded cursor-pointer hover:border-accent transition-colors">
        Выбрать файлы
        <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </label>
    </div>
  );
}