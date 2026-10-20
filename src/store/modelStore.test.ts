// src/store/modelStore.test.ts
import { describe, it, expect } from 'vitest';
import { migrateModelSettings, resolveEngineConfig, DEFAULT_CONFIG } from './modelConfig';
import { TaskDetectionResult } from '@/lib/inference/detect-task';

describe('Model Store Config', () => {
  describe('migrateModelSettings', () => {
    it('returns default config on empty or invalid persisted state', () => {
      expect(migrateModelSettings(undefined)).toEqual({ config: DEFAULT_CONFIG });
      expect(migrateModelSettings(null)).toEqual({ config: DEFAULT_CONFIG });
      expect(migrateModelSettings('мусор')).toEqual({ config: DEFAULT_CONFIG });
      expect(migrateModelSettings({})).toEqual({ config: DEFAULT_CONFIG });
    });

    it('merges config and forces task to auto', () => {
      const persisted = {
        config: {
          task: 'yolov8', // Should be forced to auto
          maxFps: 10,     // Should be kept
          preprocess: { inputWidth: 320 }, // Partial merge
          decoder: { topK: 10 }            // Partial merge
        }
      };

      const result = migrateModelSettings(persisted).config;
      
      expect(result.task).toBe('auto');
      expect(result.maxFps).toBe(10);
      expect(result.preferredBackend).toBe(DEFAULT_CONFIG.preferredBackend);
      
      // Deep merges correctly
      expect(result.preprocess.inputWidth).toBe(320);
      expect(result.preprocess.inputHeight).toBe(DEFAULT_CONFIG.preprocess.inputHeight); // from default
      expect(result.decoder.topK).toBe(10);
      expect(result.decoder.iouThreshold).toBe(DEFAULT_CONFIG.decoder.iouThreshold); // from default
    });
  });

  describe('resolveEngineConfig', () => {
    it('resolves auto task to detected task', () => {
      const config = { ...DEFAULT_CONFIG, task: 'auto' as const };
      const detected: TaskDetectionResult = { task: 'yolov8', confidence: 0.9, explanation: '' };
      
      const resolved = resolveEngineConfig(config, detected);
      expect(resolved.task).toBe('yolov8');
    });

    it('resolves auto task to raw if no detection', () => {
      const config = { ...DEFAULT_CONFIG, task: 'auto' as const };
      const resolved = resolveEngineConfig(config, null);
      expect(resolved.task).toBe('raw');
    });

    it('preserves explicit task', () => {
      const config = { ...DEFAULT_CONFIG, task: 'classification' as const };
      const detected: TaskDetectionResult = { task: 'yolov8', confidence: 0.9, explanation: '' };
      
      // Explicit task ignores detected
      const resolved = resolveEngineConfig(config, detected);
      expect(resolved.task).toBe('classification');
    });
  });
});