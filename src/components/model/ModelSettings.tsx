// src/components/model/ModelSettings.tsx
"use client";
import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import { TaskType, EngineBackend } from '@/types/inference';

export function ModelSettings() {
  const { config, setConfig, modelInfo } = useModelStore();
  const [local, setLocal] = useState(config);
  const [prevConfig, setPrevConfig] = useState(config);
  const [openSections, setOpenSections] = useState({ task: true, prep: false, post: false });

  // Синхронизация при загрузке новой модели (derived state pattern)
  if (config !== prevConfig) {
    setPrevConfig(config);
    setLocal(config);
  }

  // Проверка: требуют ли изменения перезапуска сессии
  const needsReload = 
    local.preprocess.inputWidth !== config.preprocess.inputWidth ||
    local.preprocess.inputHeight !== config.preprocess.inputHeight ||
    local.preprocess.layout !== config.preprocess.layout ||
    local.preferredBackend !== config.preferredBackend;

  const handleSave = () => {
    setConfig(() => local);
    // Для instant-настроек (пороги) Zustand обновится, и Decoder подхватит.
    // Для needsReload - логика перезапуска будет в Эпике 6.
  };

  const toggle = (sec: keyof typeof openSections) => setOpenSections(prev => ({...prev, [sec]: !prev[sec]}));

  const inputClass = "w-full bg-bg-base border border-border-subtle rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-accent font-mono tabular-nums";
  const labelClass = "text-xs text-text-muted mb-1 block";

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border-subtle flex justify-between items-center bg-bg-base">
        <span className="text-sm font-bold">Настройки {modelInfo ? `(${modelInfo.format})` : ''}</span>
        <button 
          onClick={handleSave}
          disabled={JSON.stringify(local) === JSON.stringify(config)}
          className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors ${
            JSON.stringify(local) !== JSON.stringify(config) ? 'bg-accent text-white shadow-sm' : 'bg-border-subtle/50 text-text-muted cursor-not-allowed'
          }`}
        >
          <Save size={14} /> Применить {needsReload && ' (Рестарт)'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* TASK */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <button onClick={() => toggle('task')} className="w-full flex items-center gap-2 p-2 bg-bg-base hover:bg-bg-surface text-sm font-medium">
            {openSections.task ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} Задача и Движок
          </button>
          {openSections.task && (
            <div className="p-3 grid grid-cols-2 gap-3 bg-bg-surface">
              <div>
                <label className={labelClass}>Тип задачи</label>
                <select className={inputClass} value={local.task} onChange={e => setLocal({...local, task: e.target.value as TaskType})}>
                  <option value="auto">Автоопределение</option>
                  <option value="yolov8">YOLOv8 / YOLO11</option>
                  <option value="yolov5">YOLOv5</option>
                  <option value="classification">Классификация</option>
                  <option value="raw">Сырой вывод</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Бэкенд (Preferred)</label>
                <select className={inputClass} value={local.preferredBackend} onChange={e => setLocal({...local, preferredBackend: e.target.value as EngineBackend})}>
                  <option value="webgpu">WebGPU</option>
                  <option value="wasm">WASM (CPU)</option>
                  <option value="webgl">WebGL</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* PREPROCESS */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <button onClick={() => toggle('prep')} className="w-full flex items-center gap-2 p-2 bg-bg-base hover:bg-bg-surface text-sm font-medium">
            {openSections.prep ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} Препроцессинг
          </button>
          {openSections.prep && (
            <div className="p-3 grid grid-cols-2 gap-3 bg-bg-surface">
              <div>
                <label className={labelClass}>Ширина входа (px)</label>
                <input type="number" className={inputClass} value={local.preprocess.inputWidth} onChange={e => setLocal({...local, preprocess: {...local.preprocess, inputWidth: Number(e.target.value)}})} />
              </div>
              <div>
                <label className={labelClass}>Высота входа (px)</label>
                <input type="number" className={inputClass} value={local.preprocess.inputHeight} onChange={e => setLocal({...local, preprocess: {...local.preprocess, inputHeight: Number(e.target.value)}})} />
              </div>
              <div>
                <label className={labelClass}>Раскладка</label>
                <select className={inputClass} value={local.preprocess.layout} onChange={e => setLocal({...local, preprocess: {...local.preprocess, layout: e.target.value as 'NCHW' | 'NHWC'}})}>
                  <option value="NCHW">NCHW</option>
                  <option value="NHWC">NHWC</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Letterbox (Сохр. пропорции)</label>
                <select className={inputClass} value={local.preprocess.letterbox ? 'true' : 'false'} onChange={e => setLocal({...local, preprocess: {...local.preprocess, letterbox: e.target.value === 'true'}})}>
                  <option value="true">Включен</option>
                  <option value="false">Выключен (Resize)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* POSTPROCESS (Instant) */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <button onClick={() => toggle('post')} className="w-full flex items-center gap-2 p-2 bg-bg-base hover:bg-bg-surface text-sm font-medium">
            {openSections.post ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} Постпроцессинг (На лету)
          </button>
          {openSections.post && (
            <div className="p-3 space-y-3 bg-bg-surface">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-text-muted">Порог уверенности (Confidence)</label>
                  <span className="text-xs font-mono">{local.decoder.confidenceThreshold.toFixed(2)}</span>
                </div>
                <input type="range" min="0.01" max="1" step="0.01" className="w-full accent-accent" value={local.decoder.confidenceThreshold} onChange={e => setLocal({...local, decoder: {...local.decoder, confidenceThreshold: Number(e.target.value)}})} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-text-muted">Порог NMS (IoU)</label>
                  <span className="text-xs font-mono">{local.decoder.iouThreshold.toFixed(2)}</span>
                </div>
                <input type="range" min="0.01" max="1" step="0.01" className="w-full accent-accent" value={local.decoder.iouThreshold} onChange={e => setLocal({...local, decoder: {...local.decoder, iouThreshold: Number(e.target.value)}})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className={labelClass}>Макс. объектов</label>
                  <input type="number" className={inputClass} value={local.decoder.maxDetections} onChange={e => setLocal({...local, decoder: {...local.decoder, maxDetections: Number(e.target.value)}})} />
                </div>
                <div>
                  <label className={labelClass}>Макс. FPS инференса</label>
                  <input type="number" className={inputClass} value={local.maxFps} onChange={e => setLocal({...local, maxFps: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}