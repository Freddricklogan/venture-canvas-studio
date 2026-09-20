/**
 * Persistence in the browser's localStorage. Storage can be absent, full or
 * throw (private windows, blocked site data); every access is guarded and
 * the caller is told whether the save actually happened.
 */

import type { Canvas } from './model.ts';
import { parseCanvas } from './scoring.ts';

export const STORAGE_KEY = 'venture-canvas-studio:canvas';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export function saveCanvas(canvas: Canvas, storage: StorageLike | null): { saved: boolean; reason?: string } {
  if (!storage) return { saved: false, reason: 'storage unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(canvas));
    return { saved: true };
  } catch (err) {
    return { saved: false, reason: err instanceof Error ? err.message : 'storage rejected the write' };
  }
}

export function loadCanvas(storage: StorageLike | null): { canvas: Canvas | null; warnings: string[] } {
  if (!storage) return { canvas: null, warnings: [] };
  let text: string | null = null;
  try { text = storage.getItem(STORAGE_KEY); } catch { return { canvas: null, warnings: ['storage unavailable'] }; }
  if (!text) return { canvas: null, warnings: [] };
  return parseCanvas(text);
}

export function clearCanvas(storage: StorageLike | null): void {
  try { storage?.removeItem(STORAGE_KEY); } catch { /* nothing to do */ }
}
