/** Entry point: canvas state, persistence, wiring, Executive Shell. */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { BLOCK_LABEL, emptyCanvas, sampleCanvas, type Block, type Canvas, type Hypothesis } from './model.ts';
import { blockValidation, parseCanvas, summarize, testNext, validateHypothesis } from './scoring.ts';
import { clearCanvas, loadCanvas, saveCanvas, type StorageLike } from './storage.ts';
import { renderCanvas, renderEditor, renderHypotheses, renderSummary, renderTestNext } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/venture-canvas-studio';
const PAGES = 'https://freddricklogan.github.io/venture-canvas-studio/';
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => { const n = document.getElementById(id); if (!n) throw new Error(`Missing #${id}`); return n as T; };

function storage(): StorageLike | null { try { return window.localStorage; } catch { return null; } }

const state: { canvas: Canvas; selectedId: string | null; nextId: number } = { canvas: sampleCanvas(), selectedId: 'h3', nextId: 100 };

function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void { const s = $('status'); s.textContent = text; s.dataset['tone'] = tone; }
const selected = (): Hypothesis | null => state.canvas.hypotheses.find((h) => h.id === state.selectedId) ?? null;

function persist(): void {
  state.canvas.updated = new Date().toISOString().slice(0, 10);
  const r = saveCanvas(state.canvas, storage());
  $('save-state').textContent = r.saved ? `Saved in this browser · ${state.canvas.updated}` : `Not saved (${r.reason ?? 'storage unavailable'}) — export JSON to keep your work`;
}

function render(): void {
  const c = state.canvas;
  $<HTMLInputElement>('canvas-name').value = c.name;
  renderCanvas($('canvas'), c, blockValidation(c), editBlock, addHypothesis);
  renderSummary($('summary'), summarize(c));
  renderTestNext($('next'), testNext(c), select);
  renderHypotheses($('hypotheses'), c, state.selectedId, select);
  renderEditor($('editor'), selected(), { onField, onScore, onExperiment, onDelete: deleteHypothesis });
  shell.refreshKpis();
}

function select(id: string): void { state.selectedId = id; render(); $('editor').scrollIntoView({ block: 'nearest' }); }
function editBlock(block: Block, text: string): void { state.canvas.blocks[block] = text.replace(/\s+/g, ' ').trim().slice(0, 600); persist(); render(); }
function addHypothesis(block: Block): void {
  const id = `h${state.nextId++}`;
  state.canvas.hypotheses.push({ id, block, statement: `New hypothesis about ${BLOCK_LABEL[block].toLowerCase()}`, risk: 3, confidence: 3, effort: 2, experiments: [] });
  state.selectedId = id;
  setStatus(`Added a hypothesis to ${BLOCK_LABEL[block]}. Make it falsifiable.`, 'ok');
  persist(); render();
}
function onField(field: 'statement' | 'block', value: string): void {
  const h = selected(); if (!h) return;
  const next: Hypothesis = field === 'statement' ? { ...h, statement: value } : { ...h, block: value as Block };
  const problems = validateHypothesis(next);
  if (problems.length) { setStatus(`Change rejected: ${problems[0]}.`, 'danger'); render(); return; }
  Object.assign(h, next); persist(); render();
}
function onScore(field: 'risk' | 'confidence' | 'effort', value: number): void {
  const h = selected(); if (!h) return;
  h[field] = value; persist();
  renderTestNext($('next'), testNext(state.canvas), select);
  renderHypotheses($('hypotheses'), state.canvas, state.selectedId, select);
  renderSummary($('summary'), summarize(state.canvas));
  shell.refreshKpis();
}
function onExperiment(exp: { method: string; criterion: string; result: string; outcome: 'validated' | 'invalidated' | 'inconclusive'; date: string }): void {
  const h = selected(); if (!h) return;
  const e = { id: `e${state.nextId++}`, ...exp };
  const trial: Hypothesis = { ...h, experiments: [...h.experiments, e] };
  const problems = validateHypothesis(trial);
  if (problems.length) { setStatus(`Experiment rejected: ${problems[0]}.`, 'danger'); return; }
  h.experiments.push(e);
  setStatus(`Recorded: ${exp.outcome}. "${h.statement.slice(0, 60)}" is now ${exp.outcome}.`, exp.outcome === 'invalidated' ? 'warn' : 'ok');
  persist(); render();
}
function deleteHypothesis(): void {
  const h = selected(); if (!h) return;
  state.canvas.hypotheses = state.canvas.hypotheses.filter((x) => x.id !== h.id);
  state.selectedId = null;
  setStatus('Hypothesis deleted.', 'ok'); persist(); render();
}

$('canvas-name').addEventListener('change', (e) => { state.canvas.name = (e.target as HTMLInputElement).value.trim().slice(0, 120) || 'Untitled canvas'; persist(); render(); });
$('btn-new').addEventListener('click', () => { state.canvas = emptyCanvas(); state.selectedId = null; persist(); setStatus('New empty canvas.', 'ok'); render(); });
$('btn-sample').addEventListener('click', () => { state.canvas = sampleCanvas(); state.selectedId = 'h3'; persist(); setStatus('Sample canvas loaded.', 'ok'); render(); });
$('btn-clear').addEventListener('click', () => { clearCanvas(storage()); setStatus('Saved copy removed from this browser.', 'ok'); $('save-state').textContent = 'Nothing saved in this browser'; });
function download(filename: string, body: string, type: string): void { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
$('btn-export').addEventListener('click', () => download('canvas.json', JSON.stringify(state.canvas, null, 2), 'application/json'));
$('btn-import').addEventListener('click', () => $<HTMLInputElement>('file-import').click());
$<HTMLInputElement>('file-import').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { canvas, warnings } = parseCanvas(text);
    if (!canvas) { setStatus(`Import failed: ${warnings[0] ?? 'not a canvas.'}`, 'danger'); return; }
    state.canvas = canvas; state.selectedId = canvas.hypotheses[0]?.id ?? null;
    setStatus(warnings.length ? `Imported with ${warnings.length} warning(s): ${warnings[0]}` : `Imported "${canvas.name}".`, warnings.length ? 'warn' : 'ok');
    persist(); render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});
$('btn-print').addEventListener('click', () => window.print());

const shell = mountExecShell({
  title: 'Venture Canvas Studio',
  tagline: 'A lean canvas whose every block carries falsifiable hypotheses, an experiment log with the success criterion recorded before the result, and a "test next" list ranked by risk, uncertainty and cost. Saved in your browser; nothing leaves it.',
  repo: REPO, pagesUrl: PAGES,
  badges: [{ label: 'Hypothesis-driven', tone: 'accent' }, { label: 'Saved locally · exportable', dot: true }, { label: 'Client-side only', dot: true }],
  kpis: [
    { label: 'Hypotheses', compute: () => summarize(state.canvas).hypotheses, tone: 'accent' },
    { label: 'Validated', compute: () => summarize(state.canvas).validated, tone: 'ok' },
    { label: 'Invalidated', compute: () => summarize(state.canvas).invalidated, tone: 'danger' },
    { label: 'Risk-weighted validation', compute: () => { const v = summarize(state.canvas).validation; return v == null ? '—' : `${Math.round(v * 100)}%`; }, tone: 'warn' },
    { label: 'Pivot signals', compute: () => summarize(state.canvas).pivotSignals.length }
  ],
  tour: [
    { selector: '#canvas', title: 'Nine blocks, each with a badge', body: 'The lean canvas, with a validation badge per block computed from its hypotheses. Two blocks in the sample have no hypothesis at all — the summary names them.', action: () => { state.canvas = sampleCanvas(); state.selectedId = 'h3'; persist(); render(); } },
    { selector: '#next', title: 'What to test next', body: 'Ranked by risk × (6 − confidence) ÷ effort: the riskiest thing we are least sure of, cheapest first. The top item is whether employers will trust a credential without calling the institution.', action: () => select('h3') },
    { selector: '#exp-form', title: 'Criterion before result', body: 'An experiment is recorded with its success criterion — decided before running — and its outcome. This records a landing-page test on the top hypothesis as validated.', action: () => { onExperiment({ method: 'Landing page with verify demo, 40 employer visitors', criterion: 'At least 10 of 40 run a verification', result: '14 of 40 ran a verification; 5 asked for a call.', outcome: 'validated', date: new Date().toISOString().slice(0, 10) }); } },
    { selector: '#summary', title: 'Pivot signals', body: 'An invalidated hypothesis with risk 4 or 5 is a pivot signal, not a footnote. The sample has one: career offices at mid-sized universities do not hold the budget.', action: () => {} },
    { selector: '#tools', title: 'Yours to keep', body: 'The canvas is saved in this browser after every change and can be exported as JSON, re-imported, or printed. Nothing is sent anywhere.', action: () => {} }
  ]
});

// Boot: restore a saved canvas if one exists, else the sample.
const restored = loadCanvas(storage());
if (restored.canvas) { state.canvas = restored.canvas; state.selectedId = restored.canvas.hypotheses[0]?.id ?? null; setStatus(`Restored "${restored.canvas.name}" from this browser (saved ${restored.canvas.updated}).`); }
else { setStatus(restored.warnings.length ? `Saved canvas could not be read (${restored.warnings[0]}); loaded the sample.` : 'Sample canvas loaded. Edit any block; add hypotheses; record experiments.', restored.warnings.length ? 'warn' : 'muted'); }
persist();
render();
