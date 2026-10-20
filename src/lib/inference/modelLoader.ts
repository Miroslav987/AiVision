// src/lib/inference/modelLoader.ts
import { getGlobalInferenceClient } from './clientSingleton';
import { useModelStore } from '@/store/modelStore';
import { useToastStore } from '@/store/toastStore';
import { useLogStore } from '@/store/logStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { parseLabels, COCO_LABELS } from './labels';
import { detectTaskFromShapes } from './detect-task';
import { resolveEngineConfig } from '@/store/modelConfig';

export async function handleModelFiles(files: File[]): Promise<void> {
  const { setLabels, setConfig } = useModelStore.getState();
  const { addToast } = useToastStore.getState();
  const models: File[] = [];
  let labelsFile: File | null = null;
  let keepLabels = false;

  for (const file of files) {
    const name = file.name.toLowerCase();
    
    if (name.endsWith('.onnx')) {
      models.push(file);
    } else if (name.endsWith('.txt')) {
      labelsFile = file;
    } else if (name.endsWith('.json')) {
      if (name === 'model.json') {
        addToast('warning', 'Формат TF.js пока не поддерживается, используйте .onnx');
        continue;
      }
      try {
        const text = await file.text();
        if (text.includes('"preprocess"') || text.includes('"decoder"')) {
          const parsedConfig = JSON.parse(text);
          setConfig(prev => ({
            ...prev,
            ...parsedConfig,
            preprocess: { ...prev.preprocess, ...(parsedConfig.preprocess || {}) },
            decoder: { ...prev.decoder, ...(parsedConfig.decoder || {}) }
          }));
          addToast('success', `Конфигурация ${file.name} загружена`);
        } else {
          labelsFile = file;
        }
      } catch (e) {
        addToast('error', `Ошибка чтения ${file.name}`);
      }
    } else if (name.endsWith('.pt')) {
      addToast('warning', `Формат PyTorch (.pt) не поддерживается в браузере. Конвертируйте: yolo export model=${file.name} format=onnx imgsz=640`);
    } else if (name.endsWith('.pth')) {
      addToast('warning', `Формат PyTorch (.pth) не поддерживается в браузере. Конвертируйте через torch.onnx.export`);
    } else if (name.endsWith('.h5') || name.endsWith('.keras') || name.endsWith('.pb')) {
      addToast('warning', `Формат TensorFlow не поддерживается. Конвертируйте через tf2onnx`);
    } else if (name.endsWith('.tflite') || name.endsWith('.bin') || name.endsWith('.safetensors')) {
      addToast('warning', `Формат ${file.name.split('.').pop()} не поддерживается в браузере`);
    } else {
      addToast('warning', `Формат файла ${file.name} не распознан. Поддерживается .onnx`);
    }
  }

  if (labelsFile) {
    try {
      const text = await labelsFile.text();
      const labels = parseLabels(text, labelsFile.name);
      setLabels(labels, labelsFile.name);
      addToast('success', `Метки загружены: ${Object.keys(labels).length} классов`);
      keepLabels = true;
    } catch (e) {
      addToast('error', `Ошибка парсинга меток: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
    }
  }

  if (models.length > 0) {
    await loadModel(models, { keepLabels });
  }
}

export async function loadModel(files: File[], options?: { keepLabels?: boolean }): Promise<void> {
  const { config, setModel, setConfig, setLabels, setLoading } = useModelStore.getState();
  const { addToast } = useToastStore.getState();
  const { addEvent } = useLogStore.getState();
  const client = getGlobalInferenceClient();

  if (files[0].size > 200 * 1024 * 1024) {
    addToast('warning', 'Внимание: загрузка модели больше 200МБ может потребовать много оперативной памяти');
  }

  try {
    setLoading({ progress: 0, message: 'Подготовка…' });
    client.onProgress = (p, m) => setLoading({ progress: p, message: m });

    const keepLabels = options?.keepLabels ?? false;
    const currentLabels = keepLabels ? useModelStore.getState().labels : undefined;

    const info = await client.load(files, 'onnx', resolveEngineConfig(config, null), currentLabels);
    const detected = detectTaskFromShapes(info.outputs);

    if (info.fixedInput) {
      setConfig(c => ({
        ...c,
        preprocess: { ...c.preprocess, ...info.fixedInput! }
      }));
    }

    if (!keepLabels) {
      if ((detected.task === 'yolov8' || detected.task === 'yolov5') && detected.numClasses === 80) {
        setLabels(COCO_LABELS, 'COCO (по умолчанию)');
      } else {
        setLabels(undefined, null);
      }
    }

    setModel(info, files, detected);
    
    const backendNotePart = info.backendNote ? ` — ${info.backendNote}` : '';
    addToast('success', `Модель ${info.name} загружена (${info.backend.toUpperCase()}${backendNotePart})`);
    addEvent({ type: 'info', message: `Модель загружена. ${detected.explanation}` });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    addToast('error', `Ошибка загрузки модели: ${errMsg}`);
    addEvent({ type: 'error', message: `Ошибка загрузки модели: ${errMsg}` });
  } finally {
    client.onProgress = undefined;
    setLoading(null);
  }
}

export async function unloadModel(): Promise<void> {
  const { setInferringState, clearResults } = useInferenceStore.getState();
  const { clearModel, setLabels } = useModelStore.getState();
  const client = getGlobalInferenceClient();

  try {
    setInferringState(false);
    clearResults();
    await client.unload();
  } finally {
    clearModel();
    setLabels(undefined, null);
  }
}