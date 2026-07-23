# ACG Mapper — design note & engine specification

Status: Accepted · engine v1.0.0 · single-file (`index.html`)

This document specifies the deterministic engine inside `index.html`: its data model,
algorithms, invariants, public surface, and the guarantees the test suite (`test.mjs`)
holds it to. It describes engineering behaviour only.

## 1. Purpose

The Mapper turns a plain-English business workflow into a structured comparison:

1. parse the workflow into a bounded list of typed steps;
2. cost the "consultant + SaaS subscription" route for those steps;
3. surface the sovereign (£0/month) alternative for each step;
4. match the workflow's signals to one audit rung on the Guild ladder.

Everything runs on-device. Steps 1–4 are pure functions with no I/O; the only
network calls are the optional T2/T3 parsing cascade, which is out of scope for the
deterministic engine and untested here by design (it is non-deterministic external I/O).

## 2. Data model

- **Step** — `{ id: number (1-based), action: string (≤80 chars), type: StepType }`.
- **StepType** — one of the sixteen keys of `STEP_TYPES`:
  `intake, qualify, schedule, quote, follow, close, onboard, deliver, invoice,
  pay_chase, support, marketing, inventory, logistics, feedback, renew`.
  `deliver` is the designated fallback type.
- **SAAS_DB[type]** — `[{ name, mo (monthly £), fail }]`; the consultant route.
- **SOVEREIGN_DB[type]** — `{ tool, url, why }`; the sovereign alternative.
- **CONSULTANT_RATES[tier]** — `{ discovery, mapping, implementation, training, retainer }`
  for tiers `low | mid | high | luxury`; `mid` is the fallback tier.
- **LADDER** — ordered list of four rungs, each `{ id, num, name, desc, url, signal }`,
  with ids `consult, prelaunch, reaudit, agents`.

## 3. Algorithms

### `classify(stepText) → StepType`
Iterates `STEP_TYPES` in declaration order and returns the first key whose verb
regex matches `stepText`; returns `deliver` if none match. **Order is significant:**
because `follow` is declared before `pay_chase` and its verb list contains `chase`,
a bare "chase" classifies as `follow`; only pay-chase-exclusive words (e.g. "overdue")
reach `pay_chase`. This precedence is a specified behaviour, not an accident.

### `parseWorkflow(text) → Step[]`
Normalises sentence/`then`/clause separators to a single delimiter, splits, trims,
**drops fragments of four characters or fewer**, and keeps at most the **first twelve**
chunks. Each surviving chunk is stripped of a leading `we/the/a` article and trailing
punctuation, truncated to 80 chars, and classified. Non-string input coerces to `""`
and yields `[]`.

### `consultantTotal(steps, rateTier) → bill`
Sums one-off consultant line items for the tier, sums per-step SaaS monthly fees, and
derives the yearly figures. Unknown tiers fall back to `mid`.

### `pickSaas(type)` / `pickSovereign(type)`
Table lookups with a `deliver` fallback for unknown types.

### `assessLadderPosition(steps) → rungId`
Weights the four rungs from workflow signals (step count, money-flow types, contractual
types, autonomous-pipeline shape) and returns the heaviest rung's id, resolving ties by
declaration order (`consult, prelaunch, reaudit, agents`).

## 4. Invariants (enforced by `test.mjs`)

- `classify(x)` is a total function: its result is always a key of `STEP_TYPES`.
- `parseWorkflow` never returns more than 12 steps; ids are the contiguous sequence
  `1..n`; every `step.type` is a known StepType; output is deterministic per input.
- For any steps and tier: `yearlySaas = monthlySaas × 12`,
  `retainerYearly = retainerMonthly × 12`,
  `year1 = oneOff + yearlySaas + retainerYearly`,
  `yearN = yearlySaas + retainerYearly`, and `monthlySaas` equals the sum of
  `pickSaas(step.type).mo` over the steps.
- Every StepType has both a `SAAS_DB` and a `SOVEREIGN_DB` entry (no dangling type).
- `assessLadderPosition` always returns one of the four `LADDER` ids.

## 5. Public surface

Within the page the engine is internal (inline `<script>`). For automation, the page
also answers a `postMessage` request `{ target: 'acg-mapper', action: 'map', workflow }`
with `{ steps, consultant, savings, recommendedRung }`, and `{ action: 'ping' }` with
version/prime. These are the stable external contracts.

## 6. Determinism & versioning

The engine performs no randomness, clocks, or ordering that varies by run; identical
input yields identical output. `VERSION` (`1.0.0`) and `PRIME` (`503`) are declared in
source and mirrored by `package.json` `version`. A change to any classifier regex, cost
table, or ladder weight is a behavioural change and should bump `VERSION` and update the
observed values pinned in `test.mjs`.
