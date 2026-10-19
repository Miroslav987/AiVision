import * as tf from '@tensorflow/tfjs';
import { InferenceEngine, EngineContext } from './engine';
import { ModelConfig } from '@/types/config';
import { ModelInfo, InferenceResult, InferenceTimings } from '@/types/inference';
import { ImagePreprocessor } from '../preprocess';
import { decodeYOLOv8, decodeYOLOv5, decodeClassification, extractRawTensors } from '../postprocess';

export class TfjsEngine implements InferenceEngine {
  private model: tf.GraphModel | tf.LayersModel | null = null;
  private ctx: EngineContext | null = null;
  private preprocessor = new ImagePreprocessor();
  private modelInfo: ModelInfo | null = null;
  private isGraphModel = false;

  async init(): Promise<void> {
    await tf.ready();
  }

  async load(ctx: EngineContext, onProgress: (p: number, msg: string) => void): Promise<ModelInfo> {
    this.ctx = ctx;
    onProgress(10, 'Настройка backend TFJS...');

    const backends = ['webgpu', 'webgl', 'wasm', 'cpu'];
    const preferred = ctx.config.preferredBackend === 'webgpu' ? 'webgpu' : 'wasm';
    
    let activeBackend = 'cpu';
    for (const b of [preferred, ...backends]) {
      try {
        if (await tf.setBackend(b)) {
          activeBackend = b;
          break;
        }
      } catch (e) { /* Игнорируем недоступные */ }
    }

    onProgress(30, `Загрузка модели через ${activeBackend}...`);
    
    const start = performance.now();
    try {
      if (ctx.format === 'tfjs-graph') {
        this.model = await tf.loadGraphModel(ctx.modelUrl, { onProgress: (frac) => onProgress(30 + frac * 50, 'Загрузка весов...') });
        this.isGraphModel = true;
      } else {
        this.model = await tf.loadLayersModel(ctx.modelUrl, { onProgress: (frac) => onProgress(30 + frac * 50, 'Загрузка весов...') });
        this.isGraphModel = false;
      }
    } catch (e) {
      throw new Error(`Ошибка загрузки TFJS: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Warmup
    const loadTimeMs = performance.now() - start;
    const dummyTensor = tf.zeros([1, ctx.config.preprocess.inputHeight, ctx.config.preprocess.inputWidth, 3]);
    let outShape: number[] = [];
    tf.tidy(() => {
      const res = this.model!.predict(dummyTensor) as tf.Tensor | tf.Tensor[];
      if (Array.isArray(res)) outShape = res[0].shape;
      else outShape = res.shape;
    });
    dummyTensor.dispose();

    this.modelInfo = {
      id: crypto.randomUUID(),
      name: 'TF.js Model',
      format: ctx.format,
      sizeBytes: 0,
      loadTimeMs,
      backend: activeBackend as any,
      inputs: [{ name: 'input', shape: [1, ctx.config.preprocess.inputHeight, ctx.config.preprocess.inputWidth, 3], type: 'float32' }],
      outputs: [{ name: 'output', shape: outShape, type: 'float32' }],
      labels: ctx.labels
    };

    onProgress(100, 'Готово');
    return this.modelInfo;
  }

  configure(config: ModelConfig): void {
    if (this.ctx) this.ctx.config = config;
  }

  async infer(bitmap: ImageBitmap): Promise<{ result: InferenceResult; timings: InferenceTimings }> {
    if (!this.model || !this.ctx || !this.modelInfo) throw new Error('Модель не загружена');
    const timings = { preprocessMs: 0, inferenceMs: 0, postprocessMs: 0 };
    
    let start = performance.now();
    // Обрати внимание: для TF.js удобнее использовать tf.browser.fromPixels, но мы уже написали унифицированный preprocessor.
    // Если layout NCHW, TF.js обычно требует NHWC. Оставим наш preprocessor, он делает всё.
    const prepResult = this.preprocessor.process(bitmap, this.ctx.config.preprocess);
    
    // TF.js Inference оборачивается в tf.tidy для очистки промежуточных тензоров
    const { dataArray, shape } = tf.tidy(() => {
      timings.preprocessMs = performance.now() - start;
      start = performance.now();
      
      const dims = this.ctx!.config.preprocess.layout === 'NCHW' 
        ? [1, 3, this.ctx!.config.preprocess.inputHeight, this.ctx!.config.preprocess.inputWidth]
        : [1, this.ctx!.config.preprocess.inputHeight, this.ctx!.config.preprocess.inputWidth, 3];
        
      const inputTensor = tf.tensor(prepResult.tensorData, dims as [number, number, number, number], 'float32');
      const output = this.model!.predict(inputTensor) as tf.Tensor | tf.Tensor[];
      
      const firstOut = Array.isArray(output) ? output[0] : output;
      // Мы возвращаем DataSync чтобы выйти из tidy с Float32Array, так как внутри tidy Promise не работают, но dataSync блокирует поток.
      // В воркере dataSync приемлем.
      timings.inferenceMs = performance.now() - start;
      return { dataArray: firstOut.dataSync() as Float32Array, shape: firstOut.shape };
    });

    start = performance.now();
    let inferenceResult: InferenceResult;
    const task = this.ctx.config.task;

    if (task === 'yolov8') {
      inferenceResult = { type: 'detection', data: decodeYOLOv8(dataArray, shape, prepResult, this.ctx.config.decoder, this.ctx.labels) };
    } else if (task === 'yolov5') {
      inferenceResult = { type: 'detection', data: decodeYOLOv5(dataArray, shape, prepResult, this.ctx.config.decoder, this.ctx.labels) };
    } else if (task === 'classification') {
      inferenceResult = { type: 'classification', data: decodeClassification(dataArray, this.ctx.config.decoder, this.ctx.labels) };
    } else {
      inferenceResult = { type: 'raw', data: { output: { shape, values: dataArray.slice(0, 100) } } };
    }
    timings.postprocessMs = performance.now() - start;

    return { result: inferenceResult, timings };
  }

  async unload(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  async dispose(): Promise<void> {
    await this.unload();
    tf.disposeVariables();
  }
}