# ⚒ ACG Mapper

> An **AI Craftspeople Guild** diagnostic. Paste your workflow → see what an AI-assisted build would actually contain → find the audit rung that fits your stage.
>
> Single HTML · sovereign · on-device · MIT · prime **503**

**Live:** [sjgant80-hub.github.io/acg-mapper](https://sjgant80-hub.github.io/acg-mapper/)
**Source:** [github.com/sjgant80-hub/acg-mapper](https://github.com/sjgant80-hub/acg-mapper)
**Forked from:** [FallMap](https://github.com/sjgant80-hub/fallmap) (prime 241)

---

## What it does

Paste your operating workflow in plain English. The mapper:

1. **Parses it into steps** — built-in classifier (T0) or smarter LLM parse (T3) if you've added an API key
2. **Costs the consultant route** — what a £20k consulting firm would build with SaaS subscriptions, with each platform's specific failure mode flagged
3. **Surfaces the sovereign alternative** — which fall* tool covers each step for £0/month
4. **Tallies the bill** — year 1 total, year 2+ ongoing, savings calculation
5. **Maps you to a Guild rung** — based on the workflow's signals (number of steps, regulated domains, money flow, autonomous pipeline shape), recommends which ACG audit fits the stage of build you're at

Runs entirely in your browser. Nothing leaves your device unless you opt into T3 smart parsing with your own API key.

## Why this is co-branded

[FallMap](https://github.com/sjgant80-hub/fallmap) proves the *commercial* case: building it yourself with sovereign tools saves £15-50k year one over a consultant + SaaS stack.

But cheap doesn't mean correct. **Whether you take the consultant route or build it yourself with AI, software ships.** Speed hides problems. The [AI Craftspeople Guild](https://aicraftspeopleguild.github.io) exists for what happens next: independent scrutiny of AI-assisted code before real users hit it.

The Mapper is the diagnostic front door. The Guild's services are the rungs.

## The four rungs

| # | Service | Fits when |
|---|---|---|
| **0** | Pre-build consult | Small workflow, you're not sure you have a problem yet |
| **1** | Pre-launch code audit | Shipping AI-assisted code into production · independent scrutiny against the [audit checklist](https://aicraftspeopleguild.github.io/acg-services.html) |
| **2** | Post-sprint re-audit | Already shipped · catching drift after heavy AI-assisted iteration |
| **3** | Agent-system audit | Running autonomous agents in production · prompt injection, tool over-permissioning, runaway autonomy |

The rung is matched by signals in the workflow: more steps lift you to a higher rung; money flow (invoice, chase) signals the agent rung; tiny workflows go to consult.

This is a discussion tool, not a scorecard. The recommendation surfaces a rung — your judgment decides whether to step on.

## Use it

1. Open [the tool](https://sjgant80-hub.github.io/acg-mapper/) (or `index.html` from `file://`)
2. Paste your workflow (or pick a preset)
3. Hit **Map it**
4. Read the comparison, the bill, the Guild rung
5. (Optional) Add an API key in Settings for sharper parsing
6. Download the report or copy a share-ready summary

## The one rule (the Guild's)

> **Trust needs proof — and proof has to be checked.** An audit tells you what your codebase *actually* contains — not what you hope it contains. Independence is the service: no stake in the outcome except the quality of the work.

---

## For developers

```
index.html      one file · 60KB · vanilla JS · no dependencies
README.md       this
LICENSE         MIT
.nojekyll       Pages legacy deploy
```

### Architecture

- **Sovereign:** single HTML · vanilla JS · works from `file://` · no build step
- **Cascade:** T0 (built-in classifier) → T2 (local Ollama @ 11434) → T3 (Anthropic / Gemini / OpenAI / OpenRouter — your key, BYOK)
- **Brand:** ACG palette (parchment / ink / rust / bronze) · Playfair Display + Work Sans + Courier Prime
- **fall* mesh:** broadcasts on `BroadcastChannel('fall-signal')` · responds to ping · exposes a `postMessage` API for `ping` and `map` actions

### What changed from FallMap

The engine — `parseWorkflow`, `classify`, `pickSaas`, `consultantTotal`, `pickSovereign`, `Cascade` — is unchanged. The fork is brand + reframe:

| | FallMap | ACG Mapper |
|---|---|---|
| **Palette** | dark estate (void / gold) | Guild parchment (rust / bronze) |
| **Voice** | "see the grift" | "find your rung" |
| **CTA** | Simon's £997 branded fork | ACG service ladder |
| **Diagnostic output** | savings + sovereign alternative | savings + sovereign alternative + ladder rung match |
| **Engine** | identical | identical |
| **Prime** | 241 | 503 |

Same engine. Guild face. Same workflow goes in, same comparison comes out, plus the rung mapping at the end.

### Adding a ladder rung

Add an entry to the `LADDER` array. Each rung needs `{ id, num, name, desc, url, signal }`. The `assessLadderPosition(steps)` function reads signals from the parsed workflow and weights each rung; the heaviest wins.

### Extending the workflow classifier

Add a key to `STEP_TYPES` with a verb-matching regex. Add a mapping to `SAAS_DB` (consultant route) and `SOVEREIGN_DB` (alternative route). Both routes need to know what your new step type costs and what it could be replaced by.

## Credit

- **AI Craftspeople Guild** — the audit checklist that framed the discipline · the ladder that defines the services · [aicraftspeopleguild.github.io](https://aicraftspeopleguild.github.io)
- **FallMap** — the engine this is forked from · the workflow → cost → comparison pattern

⚒ Part of the [fall* estate](https://github.com/sjgant80-hub) · prime 503 · ◊·κ=1
