# CLAUDE.md — agent working notes for acg-mapper

## What this is

A single-file, on-device web tool (`index.html`, vanilla JS, no build, no runtime
dependencies). It parses a plain-English business workflow into typed steps, costs the
consultant-plus-SaaS route, surfaces the sovereign alternative, and matches the workflow
to one audit rung. The deterministic engine is an inline `<script>` in `index.html`;
`SPEC.md` is the authority on its data model and algorithms.

## How to run the tests

```
npm test        # == node test.mjs
```

`test.mjs` has no dependencies. It reads the inline engine out of the file named by
`package.json` `main` (`index.html`), stubs the browser globals the page touches at load
time, imports the real functions as an ES module, and asserts on their observed output.

## Invariants an agent must preserve

When editing `index.html`, keep these true or the suite (correctly) goes red:

- `classify` stays a total function returning a key of `STEP_TYPES`; `deliver` remains the
  fallback. The declaration-order precedence matters — `follow` is intentionally matched
  before `pay_chase` (see `SPEC.md` §3).
- `parseWorkflow` caps output at 12 steps, drops fragments ≤4 chars, numbers ids `1..n`,
  and is deterministic per input.
- The cost identities in `SPEC.md` §4 hold for every tier and workflow; unknown tiers fall
  back to `mid`.
- Every `STEP_TYPES` key keeps an entry in both `SAAS_DB` and `SOVEREIGN_DB`.
- `assessLadderPosition` returns one of the four `LADDER` ids.

## Rules

- The engine functions are pure — no I/O, no clocks, no randomness. Keep them that way so
  the tests stay deterministic. The T2/T3 network cascade is deliberately untested.
- If you intentionally change a classifier regex, a cost table, or a ladder weight, update
  the observed values pinned in `test.mjs` in the same change, and bump `VERSION` +
  `package.json` `version`.
- Do not add runtime dependencies; this tool must keep working from `file://`.
