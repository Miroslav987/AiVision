// src/components/model/ModelSettings.tsx
"use client";
import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import { TaskType, EngineBackend, ModelConfig } from '@/types/inference';
import { loadModel } from '@/lib/inference/modelLoader';

const TASKS: TaskType[] = ['auto', 'yolov8', 'yolov5', 'classification', 'raw'];
const BACKENDS: EngineBackend[] = ['webgpu', 'wasm', 'webgl', 'remote', 'cpu'];
const LAYOUTS = ['NCHW', 'NHWC'] as const;
const CHANNELS = ['RGB', 'BGR'] as const;
const NORMS = ['0-1', 'imagenet', 'none'] as const;

const isTask = (v: string): v is TaskType => TASKS.includes(v as TaskType);
const isBackend = (v: string): v is EngineBackend => BACKENDS.includes(v as EngineBackend);
const isLayout = (v: string): v is 'NCHW' | 'NHWC' => (LAYOUTS as readonly string[]).includes(v);
const isChannels = (v: string): v is 'RGB' | 'BGR' => (CHANNELS as readonly string[]).includes(v);
const isNorm = (v: string): v is '0-1' | 'imagenet' | 'none' => (NORMS as readonly string[]).includes(v);

export function ModelSettings() {
  const config = useModelStore((s) => s.config);
  const setConfig = useModelStore((s) => s.setConfig);
  const modelInfo = useModelStore((s) => s.modelInfo);
  const modelFiles = useModelStore((s) => s.modelFiles);
  const detected = useModelStore((s) => s.detected);

  const [draft, setDraft] = useState<ModelConfig | null>(null);
  const local = draft ?? config;

  const update = (updater: (prev: ModelConfig) => ModelConfig) => {
    setDraft(updater(local));
  };

  const needsReload = draft !== null && (
    draft.preprocess.inputWidth !== config.preprocess.inputWidth ||
    draft.preprocess.inputHeight !== config.preprocess.inputHeight ||
    draft.preprocess.layout !== config.preprocess.layout ||
    draft.preferredBackend !== config.preferredBackend
  );

  const handleApply = async () => {
    if (!draft) return;
    const shouldReload = needsReload;
    setConfig(() => draft);
    setDraft(null);
    
    if (shouldReload && modelFiles) {
      await loadModel(modelFiles, { keepLabels: true });
    }
  };

  const isFixed = !!modelInfo?.fixedInput;
  const inputClass = "w-full bg-bg-base border border-border-subtle rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "text-xs text-text-muted mb-1 block";

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border-subtle flex justify-between items-center bg-bg-base shrink-0">
        <span className="text-sm font-bold">Настройки</span>
        <button 
          onClick={handleApply}
          disabled={draft === null}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            draft !== null ? 'bg-accent text-white shadow-sm hover:bg-accent/80' : 'bg-border-subtle/50 text-text-muted cursor-not-allowed'
          }`}
        >
          {needsReload ? 'Применить (перезагрузка)' : 'Применить'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <details className="group border border-border-subtle rounded-lg bg-bg-base overflow-hidden" open>
          <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-bg-surface list-none flex justify-between">
            Задача и Бэкенд
            <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 pt-0 grid grid-cols-2 gap-3 border-t border-border-subtle/50 mt-2">
            <div>
              <label className={labelClass}>Тип задачи {local.task === 'auto' && detected && <span className="text-accent ml-1">({detected.task})</span>}</label>
              <select className={inputClass} value={local.task} onChange={e => isTask(e.target.value) && update(c => ({...c, task: e.target.value as TaskType}))}>
                <option value="auto">Автоопределение</option>
                <option value="yolov8">YOLOv8 / YOLO11</option>
                <option value="yolov5">YOLOv5</option>
                <option value="classification">Классификация</option>
                <option value="raw">Сырой вывод</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Бэкенд</label>
              <select className={inputClass} value={local.preferredBackend} onChange={e => isBackend(e.target.value) && update(c => ({...c, preferredBackend: e.target.value as EngineBackend}))}>
                <option value="webgpu">WebGPU</option>
                <option value="wasm">WASM</option>
              </select>
            </div>
          </div>
        </details>

        <details className="group border border-border-subtle rounded-lg bg-bg-base overflow-hidden">
          <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-bg-surface list-none flex justify-between">
            Препроцессинг
            <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 pt-0 grid grid-cols-2 gap-3 border-t border-border-subtle/50 mt-2">
            <div>
              <label className={labelClass}>Ширина входа {isFixed && <span className="text-warning ml-1">(задано)</span>}</label>
              <input type="number" className={inputClass} value={local.preprocess.inputWidth} disabled={isFixed} onChange={e => update(c => ({...c, preprocess: {...c.preprocess, inputWidth: Number(e.target.value)}}))} />
            </div>
            <div>
              <label className={labelClass}>Высота входа {isFixed && <span className="text-warning ml-1">(задано)</span>}</label>
              <input type="number" className={inputClass} value={local.preprocess.inputHeight} disabled={isFixed} onChange={e => update(c => ({...c, preprocess: {...c.preprocess, inputHeight: Number(e.target.value)}}))} />
            </div>
            <div>
              <label className={labelClass}>Раскладка {isFixed && <span className="text-warning ml-1">(задано)</span>}</label>
              <select className={inputClass} value={local.preprocess.layout} disabled={isFixed} onChange={e => isLayout(e.target.value) && update(c => ({...c, preprocess: {...c.preprocess, layout: e.target.value as 'NCHW' | 'NHWC'}}))}>
                <option value="NCHW">NCHW</option>
                <option value="NHWC">NHWC</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Каналы</label>
              <select className={inputClass} value={local.preprocess.channels} onChange={e => isChannels(e.target.value) && update(c => ({...c, preprocess: {...c.preprocess, channels: e.target.value as 'RGB' | 'BGR'}}))}>
                <option value="RGB">RGB</option>
                <option value="BGR">BGR</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Нормализация</label>
              <select className={inputClass} value={typeof local.preprocess.normalization === 'string' ? local.preprocess.normalization : 'custom'} onChange={e => isNorm(e.target.value) && update(c => ({...c, preprocess: {...c.preprocess, normalization: e.target.value as '0-1' | 'imagenet' | 'none'}}))}>
                <option value="0-1">0-1 (div 255)</option>
                <option value="imagenet">ImageNet</option>
                <option value="none">Без нормализации</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Letterbox (сохранение пропорций)</label>
              <select className={inputClass} value={local.preprocess.letterbox ? 'true' : 'false'} onChange={e => update(c => ({...c, preprocess: {...c.preprocess, letterbox: e.target.value === 'true'}}))}>
                <option value="true">Включен</option>
                <option value="false">Выключен (Resize)</option>
              </select>
            </div>
          </div>
        </details>

        <details className="group border border-border-subtle rounded-lg bg-bg-base overflow-hidden">
          <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-bg-surface list-none flex justify-between">
            Постпроцессинг
            <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 pt-0 space-y-3 border-t border-border-subtle/50 mt-2">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-text-muted">Порог уверенности (Conf)</label>
                <span className="text-xs font-mono text-accent">{local.decoder.confidenceThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0.01" max="1" step="0.01" className="w-full accent-accent" value={local.decoder.confidenceThreshold} onChange={e => update(c => ({...c, decoder: {...c.decoder, confidenceThreshold: Number(e.target.value)}}))} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-text-muted">Порог NMS (IoU)</label>
                <span className="text-xs font-mono text-accent">{local.decoder.iouThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0.01" max="1" step="0.01" className="w-full accent-accent" value={local.decoder.iouThreshold} onChange={e => update(c => ({...c, decoder: {...c.decoder, iouThreshold: Number(e.target.value)}}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Макс. детекций</label>
                <input type="number" min="1" max="1000" className={inputClass} value={local.decoder.maxDetections} onChange={e => update(c => ({...c, decoder: {...c.decoder, maxDetections: Number(e.target.value)}}))} />
              </div>
              <div>
                <label className={labelClass}>Top-K (Классиф.)</label>
                <input type="number" min="1" max="20" className={inputClass} value={local.decoder.topK} onChange={e => update(c => ({...c, decoder: {...c.decoder, topK: Number(e.target.value)}}))} />
              </div>
            </div>
          </div>
        </details>

        <details className="group border border-border-subtle rounded-lg bg-bg-base overflow-hidden">
          <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-bg-surface list-none flex justify-between">
            Производительность
            <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 pt-0 border-t border-border-subtle/50 mt-2">
            <label className={labelClass}>Макс. FPS инференса</label>
            <input type="number" min="1" max="60" className={inputClass} value={local.maxFps} onChange={e => update(c => ({...c, maxFps: Number(e.target.value)}))} />
          </div>
        </details>
      </div>
    </div>
  );
}