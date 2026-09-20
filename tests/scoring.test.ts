import { describe, it, expect } from 'vitest';
import { BLOCKS, emptyCanvas, sampleCanvas, type Hypothesis } from '../src/model.ts';
import { blockValidation, latestExperiment, parseCanvas, priority, statusOf, summarize, testNext, validateHypothesis } from '../src/scoring.ts';

const h = (over: Partial<Hypothesis> = {}): Hypothesis => ({ id: 'x', block: 'problem', statement: 'S', risk: 4, confidence: 2, effort: 2, experiments: [], ...over });

describe('status and priority', () => {
  it('status is the latest experiment by date, or untested', () => {
    expect(statusOf(h())).toBe('untested');
    const hh = h({ experiments: [
      { id: 'a', method: 'm', criterion: 'c', result: 'r', outcome: 'validated', date: '2026-01-01' },
      { id: 'b', method: 'm', criterion: 'c', result: 'r', outcome: 'invalidated', date: '2026-03-01' }
    ] });
    expect(latestExperiment(hh)!.id).toBe('b');
    expect(statusOf(hh)).toBe('invalidated');
  });
  it('priority is risk × (6 − confidence) ÷ effort', () => {
    expect(priority(h())).toBe(8);                       // 4 × 4 / 2
    expect(priority(h({ risk: 5, confidence: 1, effort: 1 }))).toBe(25);
    expect(priority(h({ risk: 1, confidence: 5, effort: 5 }))).toBe(0.2);
  });
  it('testNext ranks untested and inconclusive only', () => {
    const c = sampleCanvas();
    const next = testNext(c);
    expect(next.every((r) => r.status === 'untested' || r.status === 'inconclusive')).toBe(true);
    expect(next[0]!.hypothesis.id).toBe('h3');           // 5 × 3 / 2 = 7.5
    for (let i = 1; i < next.length; i += 1) expect(next[i - 1]!.priority).toBeGreaterThanOrEqual(next[i]!.priority);
    expect(next.some((r) => r.hypothesis.id === 'h1')).toBe(false); // validated
  });
});

describe('validation summary', () => {
  it('scores blocks by risk-weighted validated share and flags unaddressed blocks', () => {
    const bv = blockValidation(sampleCanvas());
    expect(bv).toHaveLength(BLOCKS.length);
    expect(bv.find((b) => b.block === 'problem')!.score).toBe(1);
    expect(bv.find((b) => b.block === 'segments')!.score).toBe(0);
    expect(bv.find((b) => b.block === 'costs')!.score).toBeNull();
    const s = summarize(sampleCanvas());
    expect(s.hypotheses).toBe(7);
    expect(s.validated).toBe(1); expect(s.invalidated).toBe(1); expect(s.inconclusive).toBe(1); expect(s.untested).toBe(4);
    expect(s.experiments).toBe(3);
    expect(s.validation).toBe(Number((5 / 25).toFixed(2)));
    expect(s.unaddressed).toEqual(['costs', 'metrics']);
    expect(s.pivotSignals.map((x) => x.id)).toEqual(['h2']);
  });
  it('empty canvas', () => {
    const s = summarize(emptyCanvas());
    expect(s.validation).toBeNull();
    expect(s.unaddressed).toHaveLength(9);
  });
});

describe('validateHypothesis', () => {
  it('accepts the sample and reports problems', () => {
    for (const x of sampleCanvas().hypotheses) expect(validateHypothesis(x)).toEqual([]);
    const bad = validateHypothesis(h({ block: 'nope' as never, statement: ' ', risk: 0, experiments: [{ id: 'e', method: '', criterion: '', result: '', outcome: 'maybe' as never, date: 'yesterday' }] }));
    expect(bad).toHaveLength(6);
  });
});

describe('parseCanvas', () => {
  it('round-trips the sample through JSON', () => {
    const c = sampleCanvas();
    const r = parseCanvas(JSON.stringify(c));
    expect(r.warnings).toEqual([]);
    expect(r.canvas).toEqual(c);
  });
  it('rejects non-JSON and non-objects, fills missing blocks, drops bad hypotheses with warnings', () => {
    expect(parseCanvas('{').canvas).toBeNull();
    expect(parseCanvas('null').canvas).toBeNull();
    const r = parseCanvas({ name: '  My  canvas ', blocks: { problem: 'p' }, hypotheses: ['junk', { id: 'a', block: 'uvp', statement: 'ok', risk: 3, confidence: 3, effort: 3 }, { id: 'a', block: 'uvp', statement: 'dup', risk: 3, confidence: 3, effort: 3 }, { block: 'uvp', statement: 'bad', risk: 9, confidence: 3, effort: 3 }] });
    expect(r.canvas!.name).toBe('My canvas');
    expect(r.canvas!.blocks.problem).toBe('p');
    expect(r.canvas!.blocks.costs).toBe('');
    expect(r.canvas!.hypotheses.map((x) => x.id)).toEqual(['a']);
    expect(r.warnings).toHaveLength(3);
    expect(r.canvas!.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
