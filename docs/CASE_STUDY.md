# Case Study — Venture Canvas Studio

**Repository:** [venture-canvas-studio](https://github.com/Freddricklogan/venture-canvas-studio) · **Live demo:** [freddricklogan.github.io/venture-canvas-studio](https://freddricklogan.github.io/venture-canvas-studio/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

A first-year founder, and the people who coach them: a university venture office, an accelerator lead, an entrepreneurship instructor. I am both — I am building a career-readiness credential platform out of my work with Elevate, and I teach the lean-canvas method to students who fill in nine boxes in an afternoon and never look again. The problem is not writing the canvas; it is knowing, three months later, which of its sentences survived contact with a customer.

## 2. The problem, as a scenario

A founder presents a lean canvas to an advisory board — confident and complete. Asked which blocks have been tested: "most of it, through conversations". Asked which conversation would have changed the canvas had it gone the other way: a pause. Two months earlier the founder learned that career offices at mid-sized universities cannot approve a licence without IT procurement — which breaks the customer-segment block and the sales model with it — wrote it in a notebook, and moved on. The board approves a build. The next quarter goes on features for a buyer who cannot buy.

## 3. What it costs to leave it alone

Building on a belief that had already failed; a pivot delayed a quarter because the evidence had no home; advisors advising on a canvas that no longer describes the business. For a first-time founder the cost is runway, and I will not put a figure on runway that varies with every company. The quieter cost is the habit: a canvas treated as a plan teaches a founder to defend it, and a founder who defends beliefs stops testing them.

## 4. The approach, and the alternative I rejected

I built a canvas whose blocks carry hypotheses — one-sentence, falsifiable, scored for risk, confidence and effort — and an experiment log in which the success criterion is a required field entered before the result. The latest outcome sets each hypothesis's status; a "test next" list ranks work by risk times uncertainty divided by effort; each block shows the risk still at stake; an invalidated high-risk hypothesis becomes a pivot signal. The canvas saves to the browser after every change and can be exported, imported and printed.

The alternative I rejected was a hosted tool with accounts and sharing. A founder's canvas in its first months is private, changes daily, and should cost nothing to keep; a client-side page that saves locally and exports a file is the right shape, with storage behind an injected interface so sharing can come later. I also rejected a free-text notes field for experiments — notebooks already provide that; criterion-before-result is the whole point.

## 5. What the code does today

Real: the nine-block canvas with validation badges, hypothesis scoring and ranking, the experiment log with a required criterion, status from the latest outcome, pivot-signal detection, localStorage persistence with honest save reporting, and JSON export and import through a validating parser. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the sample canvas. Its blocks, hypotheses and experiments describe the platform I am building, as a plausible early snapshot rather than a transcript of real interviews; the page labels it a sample.

Worth knowing: the priority formula is a transparent heuristic, not a model, and risk, confidence and effort are the founder's own scores. The tool does not judge whether a hypothesis is well formed beyond requiring a statement; a badly formed one shows when its experiment cannot be scored. Saved data is treated as untrusted on the way back in.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 11 unit tests passing across two files, 100% statement coverage over the pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. Tests cover the priority formula at its extremes, validation on the sample, the parser on non-JSON, non-objects, missing blocks and bad hypotheses, and storage that is absent, throwing or corrupt. In the browser: zero console errors; the sample loads with 7 hypotheses, 1 validated, 1 invalidated, 20% risk-weighted validation and 1 pivot signal; the tour records an experiment on the top-ranked hypothesis and validation rises to 40%; the canvas persists to localStorage with 4 experiments after the tour; an experiment without a criterion is blocked. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For one founder it is production now: open the page, work, export a copy. For a venture office running a cohort it would need accounts and sharing so a coach can see a founder's canvas and log; version history; a cohort view — which hypotheses are untested everywhere, which blocks nobody has addressed; and an export for demo day. A small service with sign-in and a database, a few weeks of work; the model and parser are already the shape a server would need.

## 8. Limits and next steps

Single canvas per browser; no history; no collaboration; the sample is a snapshot, not an interview record. Next: multiple canvases with version history, a cohort view for coaches, and interview-note capture that turns a conversation into hypotheses and experiments without leaving the page.

## 9. Who should look at this

**Hiring manager:** evidence that I turn a method I teach into a tool that enforces its discipline — criterion before result — and treats the user's data carefully.
**Consulting client:** for a venture office or accelerator that wants founders to test rather than pitch; bring a cohort and we run it on real canvases.
**Engineer:** read `src/scoring.ts` for ranking and the untrusted-data parser, `src/storage.ts` for guarded persistence, and `tests/storage.test.ts` for absent and throwing storage.
