/**
 * Lean canvas + hypothesis tracker. A canvas is nine blocks of text; every
 * block can carry hypotheses; every hypothesis can carry experiments with a
 * recorded result. The engine scores which hypotheses to test next and how
 * validated the canvas is, block by block.
 */

export const BLOCKS = ['problem', 'segments', 'uvp', 'solution', 'channels', 'revenue', 'costs', 'metrics', 'advantage'] as const;
export type Block = (typeof BLOCKS)[number];
export const BLOCK_LABEL: Record<Block, string> = {
  problem: 'Problem', segments: 'Customer segments', uvp: 'Unique value proposition', solution: 'Solution', channels: 'Channels',
  revenue: 'Revenue streams', costs: 'Cost structure', metrics: 'Key metrics', advantage: 'Unfair advantage'
};

export type Outcome = 'validated' | 'invalidated' | 'inconclusive';

export interface Experiment {
  id: string;
  /** What was done — interview, landing page, concierge, pre-sale. */
  method: string;
  /** Success criterion agreed before running. */
  criterion: string;
  /** Observed result, free text. */
  result: string;
  outcome: Outcome;
  date: string; // ISO date
}

export interface Hypothesis {
  id: string;
  block: Block;
  statement: string;
  /** How much of the business breaks if this is false, 1–5. */
  risk: number;
  /** How confident we are today, 1–5. */
  confidence: number;
  /** Cost to test, 1–5 (1 = an afternoon, 5 = a quarter). */
  effort: number;
  experiments: Experiment[];
}

export interface Canvas {
  name: string;
  blocks: Record<Block, string>;
  hypotheses: Hypothesis[];
  updated: string;
}

export const SAMPLE_CANVAS: Canvas = {
  name: 'Career-readiness credential platform (sample)',
  updated: '2026-09-01',
  blocks: {
    problem: 'Employers cannot verify what a student can actually do; students cannot prove it; career offices spend staff time on manual verification.',
    segments: 'Mid-sized universities with a career-readiness programme; regional employers hiring 20–200 graduates a year.',
    uvp: 'Verifiable, employer-readable skill credentials issued from real coursework and internships — checked in seconds without calling the registrar.',
    solution: 'Issuer for career offices; wallet for students; one-click verifier for employers; rubric library mapped to employer role profiles.',
    channels: 'Career-services associations; employer advisory boards; pilot with our own programme.',
    revenue: 'Annual licence per institution tiered by enrolment; free for employers and students.',
    costs: 'Engineering, hosting, standards compliance, onboarding support, conferences.',
    metrics: 'Credentials issued per term; verifications per credential; employer repeat-verification rate; time-to-verify.',
    advantage: 'Running programme with real students and employer relationships; standards work already done.'
  },
  hypotheses: [
    { id: 'h1', block: 'problem', statement: 'Employers hiring graduates spend more than an hour per hire verifying qualifications.', risk: 5, confidence: 2, effort: 1, experiments: [
      { id: 'e1', method: 'Interviews with 8 hiring managers', criterion: 'At least 5 of 8 report over an hour per hire', result: '6 of 8 reported 1–3 hours, mostly phone and email to registrars.', outcome: 'validated', date: '2026-08-12' }
    ] },
    { id: 'h2', block: 'segments', statement: 'Career offices at mid-sized universities have budget authority for a tool like this.', risk: 4, confidence: 2, effort: 2, experiments: [
      { id: 'e2', method: 'Calls with 6 career-office directors', criterion: 'At least 3 of 6 can approve a $10k licence', result: '2 of 6 could; the rest route through IT procurement.', outcome: 'invalidated', date: '2026-08-20' }
    ] },
    { id: 'h3', block: 'uvp', statement: 'Employers will trust a credential they can verify without contacting the institution.', risk: 5, confidence: 3, effort: 2, experiments: [] },
    { id: 'h4', block: 'channels', statement: 'Career-services associations will co-host a webinar for their members.', risk: 2, confidence: 3, effort: 1, experiments: [
      { id: 'e3', method: 'Outreach to 3 associations', criterion: 'At least 1 agrees within 4 weeks', result: 'No replies within 4 weeks.', outcome: 'inconclusive', date: '2026-09-01' }
    ] },
    { id: 'h5', block: 'revenue', statement: 'Institutions will pay an annual licence rather than per credential.', risk: 4, confidence: 2, effort: 3, experiments: [] },
    { id: 'h6', block: 'solution', statement: 'Students will claim a credential within 7 days of it being issued.', risk: 3, confidence: 3, effort: 2, experiments: [] },
    { id: 'h7', block: 'advantage', statement: 'Our standards work (Open Badges 3.0, W3C VC) is a barrier competitors will take a year to match.', risk: 2, confidence: 4, effort: 4, experiments: [] }
  ]
};

export function sampleCanvas(): Canvas {
  return structuredClone(SAMPLE_CANVAS);
}

export function emptyCanvas(name = 'Untitled canvas'): Canvas {
  const blocks = {} as Record<Block, string>;
  for (const b of BLOCKS) blocks[b] = '';
  return { name, blocks, hypotheses: [], updated: new Date().toISOString().slice(0, 10) };
}
