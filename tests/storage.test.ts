import { describe, it, expect } from 'vitest';
import { clearCanvas, loadCanvas, saveCanvas, STORAGE_KEY, type StorageLike } from '../src/storage.ts';
import { sampleCanvas } from '../src/model.ts';

function memory(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
}

describe('storage', () => {
  it('saves and loads a canvas', () => {
    const s = memory();
    expect(saveCanvas(sampleCanvas(), s)).toEqual({ saved: true });
    expect(s.map.has(STORAGE_KEY)).toBe(true);
    expect(loadCanvas(s).canvas).toEqual(sampleCanvas());
    clearCanvas(s);
    expect(loadCanvas(s).canvas).toBeNull();
  });
  it('reports absent or throwing storage without throwing', () => {
    expect(saveCanvas(sampleCanvas(), null).saved).toBe(false);
    const full: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(saveCanvas(sampleCanvas(), full)).toEqual({ saved: false, reason: 'QuotaExceededError' });
    expect(loadCanvas(full).warnings).toEqual(['storage unavailable']);
    expect(loadCanvas(null).canvas).toBeNull();
    expect(() => clearCanvas(full)).not.toThrow();
  });
  it('drops a corrupt saved canvas with a warning', () => {
    const s = memory();
    s.setItem(STORAGE_KEY, '{not json');
    const r = loadCanvas(s);
    expect(r.canvas).toBeNull();
    expect(r.warnings[0]).toMatch(/Not valid JSON/);
  });
});
