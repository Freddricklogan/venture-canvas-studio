/** DOM rendering — textContent and createElement only; all canvas text is user-authored. */

import { BLOCKS, BLOCK_LABEL, type Block, type Canvas, type Hypothesis } from './model.ts';
import { latestExperiment, statusOf, type BlockValidation, type CanvasSummary, type Ranked, type Status } from './scoring.ts';

type Props = Record<string, string | number | boolean | null | undefined>;
export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}
export function clear(node: Element): void { while (node.firstChild) node.removeChild(node.firstChild); }
const STATUS_LABEL: Record<Status, string> = { validated: 'Validated', invalidated: 'Invalidated', inconclusive: 'Inconclusive', untested: 'Untested' };

export function renderCanvas(host: HTMLElement, canvas: Canvas, validation: BlockValidation[], onEdit: (block: Block, text: string) => void, onAdd: (block: Block) => void): void {
  clear(host);
  const byBlock = new Map(validation.map((v) => [v.block, v]));
  for (const block of BLOCKS) {
    const v = byBlock.get(block)!;
    const ta = el('textarea', { id: `blk-${block}`, class: 'vcs-block__text', rows: '4', maxlength: '600', placeholder: `What do we believe about ${BLOCK_LABEL[block].toLowerCase()}?` }) as HTMLTextAreaElement;
    ta.value = canvas.blocks[block];
    ta.addEventListener('change', () => onEdit(block, ta.value));
    const add = el('button', { type: 'button', class: 'vcs-mini', text: '+ hypothesis', 'aria-label': `Add a hypothesis to ${BLOCK_LABEL[block]}` });
    add.addEventListener('click', () => onAdd(block));
    const badge = v.hypotheses === 0
      ? el('span', { class: 'vcs-badge', 'data-tone': 'muted', text: 'no hypotheses' })
      : el('span', { class: 'vcs-badge', 'data-tone': v.score == null ? 'muted' : v.score >= 0.75 ? 'ok' : v.score > 0 ? 'warn' : 'danger', text: `${v.validated}/${v.hypotheses} validated · risk at stake ${v.riskAtStake}` });
    host.append(el('section', { class: `vcs-block vcs-block--${block}`, 'aria-labelledby': `blk-h-${block}` }, [
      el('div', { class: 'vcs-block__head' }, [el('label', { id: `blk-h-${block}`, for: `blk-${block}`, class: 'vcs-block__title', text: BLOCK_LABEL[block] }), badge]),
      ta,
      add
    ]));
  }
}

export function renderSummary(host: HTMLElement, s: CanvasSummary): void {
  clear(host);
  const rows: Array<[string, string, string?]> = [
    ['Hypotheses', String(s.hypotheses), `${s.validated} validated · ${s.invalidated} invalidated · ${s.inconclusive} inconclusive · ${s.untested} untested`],
    ['Experiments recorded', String(s.experiments)],
    ['Risk-weighted validation', s.validation == null ? '—' : `${Math.round(s.validation * 100)}%`, 'risk of validated hypotheses ÷ total risk'],
    ['Blocks without a hypothesis', s.unaddressed.length ? s.unaddressed.map((b) => BLOCK_LABEL[b]).join(', ') : 'none'],
    ['Pivot signals', s.pivotSignals.length ? s.pivotSignals.map((h) => h.statement).join(' · ') : 'none', 'invalidated hypotheses with risk 4 or 5']
  ];
  for (const [k, v, note] of rows) host.append(el('div', { class: 'vcs-kv' }, [el('dt', {}, [el('span', { text: k }), note ? el('span', { class: 'vcs-note', text: note }) : null]), el('dd', { text: v })]));
}

export function renderTestNext(host: HTMLElement, ranked: Ranked[], onSelect: (id: string) => void): void {
  clear(host);
  if (!ranked.length) { host.append(el('li', { class: 'vcs-muted', text: 'Nothing left to test — every hypothesis has a conclusive result.' })); return; }
  ranked.forEach((r, i) => {
    const btn = el('button', { type: 'button', class: 'vcs-next' }, [
      el('span', { class: 'vcs-next__rank', text: String(i + 1) }),
      el('span', { class: 'vcs-next__body' }, [
        el('span', { class: 'vcs-next__stmt', text: r.hypothesis.statement }),
        el('span', { class: 'vcs-next__meta', text: `${BLOCK_LABEL[r.hypothesis.block]} · risk ${r.hypothesis.risk} · confidence ${r.hypothesis.confidence} · effort ${r.hypothesis.effort} · priority ${r.priority} · ${STATUS_LABEL[r.status]}` })
      ])
    ]);
    btn.addEventListener('click', () => onSelect(r.hypothesis.id));
    host.append(el('li', {}, [btn]));
  });
}

export function renderHypotheses(host: HTMLElement, canvas: Canvas, selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Hypothesis', 'Block', 'Risk', 'Conf.', 'Effort', 'Experiments', 'Status'].map((t) => el('th', { scope: 'col', text: t })))]));
  const body = el('tbody');
  for (const h of canvas.hypotheses) {
    const s = statusOf(h);
    const tr = el('tr', { class: h.id === selectedId ? 'is-selected' : '', tabindex: '0', role: 'button', 'aria-pressed': String(h.id === selectedId), 'aria-label': `Select hypothesis: ${h.statement}` }, [
      el('th', { scope: 'row', text: h.statement }), el('td', { text: BLOCK_LABEL[h.block] }), el('td', { text: String(h.risk) }), el('td', { text: String(h.confidence) }), el('td', { text: String(h.effort) }),
      el('td', { text: String(h.experiments.length) }), el('td', {}, [el('span', { class: 'vcs-chip', 'data-status': s, text: STATUS_LABEL[s] })])
    ]);
    tr.addEventListener('click', () => onSelect(h.id));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(h.id); } });
    body.append(tr);
  }
  host.append(body);
}

export interface EditorHandlers {
  onField: (field: 'statement' | 'block', value: string) => void;
  onScore: (field: 'risk' | 'confidence' | 'effort', value: number) => void;
  onExperiment: (exp: { method: string; criterion: string; result: string; outcome: 'validated' | 'invalidated' | 'inconclusive'; date: string }) => void;
  onDelete: () => void;
}

export function renderEditor(host: HTMLElement, h: Hypothesis | null, handlers: EditorHandlers): void {
  clear(host);
  if (!h) { host.append(el('p', { class: 'vcs-muted', text: 'Select a hypothesis, or add one from a canvas block.' })); return; }
  const s = statusOf(h);
  host.append(el('div', { class: 'vcs-status', 'data-status': s }, [el('strong', { text: STATUS_LABEL[s] }), el('span', { class: 'vcs-muted', text: latestExperiment(h) ? ` — latest experiment ${latestExperiment(h)!.date}` : ' — no experiment yet' })]));
  const stmt = el('textarea', { id: 'hyp-statement', class: 'vcs-text', rows: '2', maxlength: '300' }) as HTMLTextAreaElement;
  stmt.value = h.statement;
  stmt.addEventListener('change', () => handlers.onField('statement', stmt.value));
  host.append(el('label', { for: 'hyp-statement', class: 'vcs-label' }, ['Statement (falsifiable, one sentence)', stmt]));
  const blockSel = el('select', { id: 'hyp-block', class: 'vcs-select' }) as HTMLSelectElement;
  for (const b of BLOCKS) blockSel.append(el('option', { value: b, selected: b === h.block ? true : null, text: BLOCK_LABEL[b] }));
  blockSel.addEventListener('change', () => handlers.onField('block', blockSel.value));
  host.append(el('label', { for: 'hyp-block', class: 'vcs-label' }, ['Block', blockSel]));
  const scores = el('div', { class: 'vcs-scores' });
  for (const [field, label, hint] of [['risk', 'Risk', 'how much breaks if false'], ['confidence', 'Confidence', 'how sure we are today'], ['effort', 'Effort to test', '1 afternoon … 5 a quarter']] as const) {
    const id = `hyp-${field}`;
    const out = el('output', { for: id, class: 'vcs-scores__val', text: String(h[field]) });
    const input = el('input', { type: 'range', id, min: '1', max: '5', step: '1', value: String(h[field]) }) as HTMLInputElement;
    input.addEventListener('input', () => { out.textContent = input.value; handlers.onScore(field, Number(input.value)); });
    scores.append(el('div', { class: 'vcs-score' }, [el('label', { for: id, text: `${label} — ${hint}` }), out, input]));
  }
  host.append(scores);
  // Experiment log
  const log = el('ul', { class: 'vcs-log' });
  for (const e of h.experiments.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    log.append(el('li', { class: 'vcs-log__item', 'data-status': e.outcome }, [
      el('span', { class: 'vcs-chip', 'data-status': e.outcome, text: STATUS_LABEL[e.outcome] }), ` ${e.date} · ${e.method}`,
      el('div', { class: 'vcs-log__crit', text: `Criterion: ${e.criterion}` }), el('div', { class: 'vcs-log__res', text: `Result: ${e.result}` })
    ]));
  }
  host.append(el('h4', { class: 'vcs-sub', text: `Experiment log (${h.experiments.length})` }), log);
  // Record experiment
  const form = el('form', { class: 'vcs-form', id: 'exp-form' });
  const method = el('input', { type: 'text', id: 'exp-method', required: true, maxlength: '200', placeholder: 'e.g. 8 hiring-manager interviews' }) as HTMLInputElement;
  const criterion = el('input', { type: 'text', id: 'exp-criterion', required: true, maxlength: '300', placeholder: 'decided before running, e.g. at least 5 of 8 say yes' }) as HTMLInputElement;
  const result = el('textarea', { id: 'exp-result', rows: '2', maxlength: '600', placeholder: 'what was observed' }) as HTMLTextAreaElement;
  const outcome = el('select', { id: 'exp-outcome' }) as HTMLSelectElement;
  for (const o of ['validated', 'invalidated', 'inconclusive'] as const) outcome.append(el('option', { value: o, text: STATUS_LABEL[o] }));
  const date = el('input', { type: 'date', id: 'exp-date', required: true, value: new Date().toISOString().slice(0, 10) }) as HTMLInputElement;
  form.append(
    el('label', { for: 'exp-method', class: 'vcs-label' }, ['Method', method]),
    el('label', { for: 'exp-criterion', class: 'vcs-label' }, ['Success criterion', criterion]),
    el('label', { for: 'exp-result', class: 'vcs-label' }, ['Result', result]),
    el('div', { class: 'vcs-form__row' }, [el('label', { for: 'exp-outcome', class: 'vcs-label' }, ['Outcome', outcome]), el('label', { for: 'exp-date', class: 'vcs-label' }, ['Date', date])]),
    el('div', { class: 'vcs-form__row' }, [el('button', { type: 'submit', class: 'vcs-btn vcs-btn--primary', text: 'Record experiment' }), (() => { const d = el('button', { type: 'button', class: 'vcs-btn vcs-btn--danger', text: 'Delete hypothesis' }); d.addEventListener('click', handlers.onDelete); return d; })()])
  );
  form.addEventListener('submit', (ev) => { ev.preventDefault(); handlers.onExperiment({ method: method.value, criterion: criterion.value, result: result.value, outcome: outcome.value as 'validated', date: date.value }); });
  host.append(el('h4', { class: 'vcs-sub', text: 'Record an experiment' }), form);
}
