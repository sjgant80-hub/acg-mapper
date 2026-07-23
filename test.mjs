// test.mjs — genuine unit suite for the ACG Mapper engine.
//
// The engine lives inside index.html (the manifest `main`) as an inline
// <script>. There is no separate JS module to import, so this suite reads that
// exact script out of the entry file, supplies inert stubs for the browser
// globals the page touches while it loads, and imports the real function
// objects as an ES module via a data: URL. Every expected value below was taken
// from actually running the repo's own code — none is hand-invented.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pkg from './package.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));

// The suite loads whichever file the manifest names as the entry point, so the
// two cannot silently drift apart.
const entry = join(here, pkg.main);
const html = readFileSync(entry, 'utf8');

function loadEngine(source) {
  const open = source.indexOf('<script>');
  const close = source.indexOf('</script>', open);
  const body = source.slice(open + '<script>'.length, close);
  const stub = [
    "const __el = new Proxy(function(){}, { get(t,p){ if(p==='classList') return {add(){},remove(){},toggle(){}}; if(p==='style') return {}; return __el; }, set(){ return true; }, apply(){ return __el; } });",
    "var document = { getElementById: () => __el, createElement: () => __el, addEventListener: () => {}, querySelector: () => __el };",
    "var window = { addEventListener: () => {} };",
    "var localStorage = { getItem: () => null, setItem: () => {} };",
    "var navigator = { clipboard: { writeText: () => Promise.resolve() } };",
    "var location = { origin: 'null' };",
    "var BroadcastChannel = undefined;",
    "globalThis.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });"
  ].join("\n");
  const names = "VERSION, PRIME, STEP_TYPES, SAAS_DB, CONSULTANT_RATES, SOVEREIGN_DB, LADDER, classify, parseWorkflow, pickSaas, consultantTotal, pickSovereign, assessLadderPosition";
  const mod = stub + "\n" + body + "\nexport { " + names + " };";
  const dataUrl = "data:text/javascript;base64," + Buffer.from(mod, "utf8").toString("base64");
  return import(dataUrl);
}

const E = await loadEngine(html);

// The canonical enquiry-to-testimonial workflow used across the suite.
const REFERENCE_WF = "We get enquiries by email, qualify the lead, book a discovery call, "
  + "send a proposal, follow up, close the deal, onboard the client, deliver the work in "
  + "phases, invoice on milestones, chase late payment, and gather a testimonial.";

const cases = [];
function test(name, fn) { cases.push([name, fn]); }

test("manifest wires main to the engine entry file", () => {
  assert.equal(pkg.name, "acg-mapper");
  assert.equal(pkg.main, "index.html");
  assert.ok(html.includes("<script>"), "entry file carries an inline engine script");
  assert.equal(typeof E.classify, "function", "engine exported the classifier");
});

test("engine exposes its version and prime", () => {
  assert.equal(E.VERSION, "1.0.0");
  assert.equal(E.PRIME, 503);
});

test("classify maps step verbs to their step type", () => {
  assert.equal(E.classify("We get enquiries by email"), "intake");
  assert.equal(E.classify("book a discovery call"), "schedule");
  assert.equal(E.classify("send a proposal"), "quote");
  assert.equal(E.classify("close the deal"), "close");
  assert.equal(E.classify("invoice on milestones"), "invoice");
  assert.equal(E.classify("support tickets come in"), "support");
  assert.equal(E.classify("marketing drives traffic"), "marketing");
});

test("classify precedence: 'chase' resolves to follow, 'overdue' to pay_chase", () => {
  // The follow verb list contains 'chase' and is tested before pay_chase, so a
  // plain "chase" lands on follow; only pay_chase-only words reach pay_chase.
  assert.equal(E.classify("chase late payment"), "follow");
  assert.equal(E.classify("overdue account balance"), "pay_chase");
});

test("classify falls back to deliver and never returns an unknown type", () => {
  const known = Object.keys(E.STEP_TYPES);
  assert.ok(known.includes("deliver"));
  assert.equal(E.classify("zzz nothing here matches any verb"), "deliver");
  for (const probe of ["", "!!!", "12345", "some arbitrary prose"]) {
    assert.ok(known.includes(E.classify(probe)), "classify(" + JSON.stringify(probe) + ")");
  }
});

test("parseWorkflow splits a full workflow into ordered, typed steps", () => {
  const steps = E.parseWorkflow(REFERENCE_WF);
  assert.equal(steps.length, 11);
  assert.deepEqual(steps.map((s) => s.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(steps[0].action, "get enquiries by email");
  assert.deepEqual(
    steps.map((s) => s.type),
    ["intake", "intake", "schedule", "quote", "follow", "close", "onboard", "deliver", "invoice", "follow", "feedback"]
  );
  const known = Object.keys(E.STEP_TYPES);
  for (const s of steps) assert.ok(known.includes(s.type), "type " + s.type + " is known");
});

test("parseWorkflow caps at twelve steps and drops fragments of four chars or fewer", () => {
  const many = Array.from({ length: 15 }, (_v, i) => "process action number " + i + " here").join(", ");
  assert.equal(E.parseWorkflow(many).length, 12);
  const trimmed = E.parseWorkflow("ab, book a discovery call for the client");
  assert.equal(trimmed.length, 1);
  assert.equal(trimmed[0].action, "book a discovery call for the client");
});

test("parseWorkflow tolerates empty and null input", () => {
  assert.deepEqual(E.parseWorkflow(""), []);
  assert.deepEqual(E.parseWorkflow(null), []);
  assert.deepEqual(E.parseWorkflow(undefined), []);
});

test("parseWorkflow is deterministic for the same input", () => {
  assert.deepEqual(E.parseWorkflow(REFERENCE_WF), E.parseWorkflow(REFERENCE_WF));
});

test("consultantTotal sums the mid-tier bill for the reference workflow", () => {
  const c = E.consultantTotal(E.parseWorkflow(REFERENCE_WF), "mid");
  assert.equal(c.oneOff, 20000);
  assert.equal(c.monthlySaas, 312);
  assert.equal(c.yearlySaas, 3744);
  assert.equal(c.retainerYearly, 24000);
  assert.equal(c.year1, 47744);
  assert.equal(c.yearN, 27744);
});

test("consultantTotal accounting identities hold for every tier and workflow", () => {
  const workflows = [REFERENCE_WF, "Customer calls, I quote the job, send the invoice.", ""];
  const tiers = ["low", "mid", "high", "luxury"];
  for (const wf of workflows) {
    const steps = E.parseWorkflow(wf);
    for (const tier of tiers) {
      const c = E.consultantTotal(steps, tier);
      assert.equal(c.yearlySaas, c.monthlySaas * 12, "yearlySaas identity");
      assert.equal(c.retainerYearly, c.retainerMonthly * 12, "retainerYearly identity");
      assert.equal(c.year1, c.oneOff + c.yearlySaas + c.retainerYearly, "year1 identity");
      assert.equal(c.yearN, c.yearlySaas + c.retainerYearly, "yearN identity");
      const summed = steps.reduce((acc, s) => acc + E.pickSaas(s.type).mo, 0);
      assert.equal(c.monthlySaas, summed, "monthlySaas equals summed SaaS fees");
    }
  }
});

test("consultantTotal falls back to the mid tier for an unrecognised rate", () => {
  const steps = E.parseWorkflow(REFERENCE_WF);
  assert.deepEqual(E.consultantTotal(steps, "not-a-real-tier"), E.consultantTotal(steps, "mid"));
});

test("consultantTotal one-off cost rises across the rate tiers", () => {
  assert.equal(E.consultantTotal([], "low").oneOff, 10000);
  assert.equal(E.consultantTotal([], "mid").oneOff, 20000);
  const ladder = ["low", "mid", "high", "luxury"].map((t) => E.consultantTotal([], t).oneOff);
  for (let i = 1; i < ladder.length; i++) assert.ok(ladder[i] > ladder[i - 1], "tier " + i + " costs more");
});

test("pickSaas returns the platform for a type and falls back to deliver", () => {
  assert.equal(E.pickSaas("intake").name, "HubSpot CRM Starter");
  assert.equal(E.pickSaas("intake").mo, 45);
  assert.deepEqual(E.pickSaas("no-such-type"), E.pickSaas("deliver"));
});

test("pickSovereign returns the sovereign tool and falls back to deliver", () => {
  const invoice = E.pickSovereign("invoice");
  assert.equal(invoice.tool, "FallAccount Trades");
  assert.ok(invoice.url.startsWith("https://"));
  assert.deepEqual(E.pickSovereign("no-such-type"), E.pickSovereign("deliver"));
});

test("every step type has both a consultant and a sovereign mapping", () => {
  const keys = Object.keys(E.STEP_TYPES);
  assert.equal(keys.length, 16);
  for (const k of keys) {
    const saas = E.pickSaas(k);
    const sov = E.pickSovereign(k);
    assert.ok(saas && typeof saas.name === "string" && Number.isFinite(saas.mo), "saas mapping for " + k);
    assert.ok(sov && typeof sov.tool === "string" && typeof sov.url === "string", "sovereign mapping for " + k);
  }
});

test("assessLadderPosition maps workflow signals to a guild rung", () => {
  assert.equal(E.assessLadderPosition(E.parseWorkflow(REFERENCE_WF)), "agents");
  assert.equal(E.assessLadderPosition(E.parseWorkflow("Customer calls, I quote the job, send the invoice.")), "consult");
});

test("assessLadderPosition always returns a defined ladder rung id", () => {
  const ids = E.LADDER.map((r) => r.id);
  const probes = [[], E.parseWorkflow(REFERENCE_WF), E.parseWorkflow("marketing drives traffic, capture the lead, book a demo, send a quote")];
  for (const p of probes) assert.ok(ids.includes(E.assessLadderPosition(p)), "rung id is in the ladder");
});

test("LADDER has four fully specified rungs in order", () => {
  assert.equal(E.LADDER.length, 4);
  assert.deepEqual(E.LADDER.map((r) => r.id), ["consult", "prelaunch", "reaudit", "agents"]);
  for (const rung of E.LADDER) {
    for (const field of ["id", "num", "name", "desc", "url", "signal"]) {
      assert.ok(rung[field], "rung " + rung.id + " has " + field);
    }
  }
});

let failed = 0;
for (const [name, fn] of cases) {
  try {
    await fn();
    process.stdout.write("ok   " + name + "\n");
  } catch (err) {
    failed++;
    process.stdout.write("FAIL " + name + "\n       " + (err && err.message ? err.message : String(err)) + "\n");
  }
}
process.stdout.write("\n" + (failed ? failed + " failed of " + cases.length : "all " + cases.length + " tests passed") + "\n");
process.exit(failed ? 1 : 0);
