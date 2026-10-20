// src/lib/inference/presence.ts
import { InferenceResult } from '@/types/inference';

export class ClassPresenceTracker {
  private lastSeen = new Map<string, number>();

  constructor(private holdMs = 1000) {}

  update(result: InferenceResult, nowMs: number): { appeared: string[]; disappeared: string[] } {
    const currentClasses = new Set<string>();

    if (result.type === 'detection') {
      for (const d of result.data) {
        currentClasses.add(d.className);
      }
    } else if (result.type === 'classification' && result.data.length > 0) {
      // Берём только top-1
      currentClasses.add(result.data[0].className);
    }

    const appeared: string[] = [];
    const disappeared: string[] = [];

    // Обновляем появившиеся
    for (const cls of currentClasses) {
      if (!this.lastSeen.has(cls)) {
        appeared.push(cls);
      }
      this.lastSeen.set(cls, nowMs);
    }

    // Проверяем исчезнувшие
    for (const [cls, timestamp] of this.lastSeen.entries()) {
      if (!currentClasses.has(cls)) {
        if (nowMs - timestamp > this.holdMs) {
          disappeared.push(cls);
          this.lastSeen.delete(cls);
        }
      }
    }

    return { appeared, disappeared };
  }

  reset(): void {
    this.lastSeen.clear();
  }
}