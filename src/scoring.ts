/**
 * Which hypothesis to test next, and how validated is the canvas.
 *
 *   priority   = risk × (6 − confidence) ÷ effort
 *                the riskiest thing we are least sure of, cheapest first
 *   status     = latest experiment outcome, or 'untested'
 *   block validation = share of a block's hypotheses whose latest outcome is validated,
 *                weighted by risk; blocks with no hypotheses are 'unaddressed'
 */

import { BLOCKS, type Block, type Canvas, type Experiment, type Hypothesis, type Outcome } from './model.ts';

export type Status = Outcome | 'untested';

export function latestExperiment(h: Hypothesis): Experiment | null {
  if (!h.experiments.length) return null;
  return h.experiments.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).at(-1) ?? null;
}

export function statusOf(h: Hypothesis): Status {
  return latestExperiment(h)?.outcome ?? 'untested';
}

export function priority(h: Hypothesis): number {
  return Number(((h.risk * (6 - h.confidence)) / Math.max(1, h.effort)).toFixed(2));
}

export interface Ranked { hypothesis: Hypothesis; priority: number; status: Status }

/** Untested and inconclusive hypotheses ranked by priority; validated and invalidated are excluded from "test next". */
export function testNext(canvas: Canvas): Ranked[] {
  return canvas.hypotheses
    .map((h) => ({ hypothesis: h, priority: priority(h), status: statusOf(h) }))
    .filter((r) => r.status === 'untested' || r.status === 'inconclusive')
    .sort((a, b) => b.priority - a.priority || a.hypothesis.id.localeCompare(b.hypothesis.id));
}

export interface BlockValidation { block: Block; hypotheses: number; validated: number; invalidated: number; untested: number; inconclusive: number; score: number | null; riskAtStake: number }

export function blockValidation(canvas: Canvas): BlockValidation[] {
  return BLOCKS.map((block) => {
    const hs = canvas.hypotheses.filter((h) => h.block === block);
    const counts = { validated: 0, invalidated: 0, untested: 0, inconclusive: 0 };
    let weight = 0; let validatedWeight = 0; let riskAtStake = 0;
    for (const h of hs) {
      const s = statusOf(h);
      counts[s] += 1;
      weight += h.risk;
      if (s === 'validated') validatedWeight += h.risk;
      else riskAtStake += h.risk;
    }
    return { block, hypotheses: hs.length, ...counts, score: weight > 0 ? Number((validatedWeight / weight).toFixed(2)) : null, riskAtStake };
  });
}

export interface CanvasSummary {
  hypotheses: number;
  validated: number;
  invalidated: number;
  untested: number;
  inconclusive: number;
  experiments: number;
  /** Risk-weighted validated share across all hypotheses. */
  validation: number | null;
  /** Blocks with no hypothesis at all. */
  unaddressed: Block[];
  /** Hypotheses invalidated that carry risk ≥ 4 — the canvas needs a pivot on these. */
  pivotSignals: Hypothesis[];
}

export function summarize(canvas: Canvas): CanvasSummary {
  const counts = { validated: 0, invalidated: 0, untested: 0, inconclusive: 0 };
  let weight = 0; let validatedWeight = 0; let experiments = 0;
  for (const h of canvas.hypotheses) {
    const s = statusOf(h);
    counts[s] += 1;
    weight += h.risk;
    if (s === 'validated') validatedWeight += h.risk;
    experiments += h.experiments.length;
  }
  const blocks = blockValidation(canvas);
  return {
    hypotheses: canvas.hypotheses.length, ...counts, experiments,
    validation: weight > 0 ? Number((validatedWeight / weight).toFixed(2)) : null,
    unaddressed: blocks.filter((b) => b.hypotheses === 0).map((b) => b.block),
    pivotSignals: canvas.hypotheses.filter((h) => statusOf(h) === 'invalidated' && h.risk >= 4)
  };
}

const clean = (s: string, max: number): string => s.replace(/\s+/g, ' ').trim().slice(0, max);
/** Text from an untrusted value: strings and numbers only; objects become empty. */
const asText = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');

export function validateHypothesis(h: Hypothesis): string[] {
  const p: string[] = [];
  if (!BLOCKS.includes(h.block)) p.push('block must be one of the nine canvas blocks');
  if (!clean(h.statement, 300)) p.push('statement is required');
  for (const k of ['risk', 'confidence', 'effort'] as const) if (!Number.isInteger(h[k]) || h[k] < 1 || h[k] > 5) p.push(`${k} must be an integer 1–5`);
  for (const e of h.experiments) {
    if (!['validated', 'invalidated', 'inconclusive'].includes(e.outcome)) p.push(`experiment ${e.id}: outcome must be validated, invalidated or inconclusive`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) p.push(`experiment ${e.id}: date must be YYYY-MM-DD`);
    if (!clean(e.criterion, 300)) p.push(`experiment ${e.id}: a success criterion must be stated before the result`);
  }
  return p;
}

/**
 * Parse an untrusted saved canvas (localStorage or an uploaded JSON file).
 * Drops invalid hypotheses with warnings; never throws.
 */
export function parseCanvas(input: unknown): { canvas: Canvas | null; warnings: string[] } {
  const warnings: string[] = [];
  let raw: unknown = input;
  if (typeof input === 'string') {
    try { raw = JSON.parse(input); } catch { return { canvas: null, warnings: ['Not valid JSON.'] }; }
  }
  if (!raw || typeof raw !== 'object') return { canvas: null, warnings: ['Not a canvas object.'] };
  const r = raw as Record<string, unknown>;
  const blocksIn = (r['blocks'] && typeof r['blocks'] === 'object' ? r['blocks'] : {}) as Record<string, unknown>;
  const blocks = {} as Record<Block, string>;
  for (const b of BLOCKS) blocks[b] = clean(asText(blocksIn[b]), 600);
  const hypotheses: Hypothesis[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(r['hypotheses']) ? r['hypotheses'] : [];
  list.forEach((x, idx) => {
    if (!x || typeof x !== 'object') { warnings.push(`Hypothesis ${idx + 1}: not an object; skipped.`); return; }
    const o = x as Record<string, unknown>;
    const exps = Array.isArray(o['experiments']) ? o['experiments'] : [];
    const h: Hypothesis = {
      id: clean(asText(o['id']), 40) || `h-${idx + 1}`,
      block: asText(o['block']) as Block,
      statement: clean(asText(o['statement']), 300),
      risk: Number(o['risk']), confidence: Number(o['confidence']), effort: Number(o['effort']),
      experiments: exps.filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object').map((e, j) => ({
        id: clean(asText(e['id']), 40) || `e-${idx + 1}-${j + 1}`,
        method: clean(asText(e['method']), 200), criterion: clean(asText(e['criterion']), 300), result: clean(asText(e['result']), 600),
        outcome: asText(e['outcome']) as Outcome, date: asText(e['date'])
      }))
    };
    const problems = validateHypothesis(h);
    if (seen.has(h.id)) problems.push(`duplicate id "${h.id}"`);
    if (problems.length) { warnings.push(`Hypothesis ${idx + 1}: ${problems.join('; ')}; skipped.`); return; }
    seen.add(h.id);
    hypotheses.push(h);
  });
  const updated = /^\d{4}-\d{2}-\d{2}$/.test(asText(r['updated'])) ? String(r['updated']) : new Date().toISOString().slice(0, 10);
  return { canvas: { name: clean(asText(r['name']), 120) || 'Untitled canvas', blocks, hypotheses, updated }, warnings };
}
