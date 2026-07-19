/*  prototype/_verify_search.js
 *  Smoke-test for the global search index — no DOM needed.
 *
 *  Loads DIAGRAMS (the way _verify.js does), then `require()`s renderer.js —
 *  which exposes Renderer._search.{buildIndex,run} without booting a DOM.
 *  Asserts the search contract from HANDOFF search spec:
 *    1. "kick"       → "Engineering Kick-Off" in the Activities group.
 *    2. "EPM"        → an Attributes hit whose matched field is Responsible.
 *    3. "management" → "Project Management" in the Pages group (title match).
 *    4. "k"          → empty (below the 2-char minimum).
 *    5. Cross-diagram dedupe: "Engineering Kick-Off" (label in 3 diagrams)
 *       yields 3 distinct activity rows; each node appears at most once.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Load diagrams.js the same way _verify.js does (so DIAGRAMS lives on global).
let code = fs.readFileSync(path.join(__dirname, "diagrams.js"), "utf8");
code = code.replace("const DIAGRAMS =", "global.DIAGRAMS =");
eval(code);

const Renderer = require("./renderer.js");
assert.ok(Renderer._search, "Renderer._search not exposed");
const run = Renderer._search.run;

// 1) "kick" → Engineering Kick-Off in Activities.
const r1 = run("kick");
assert.ok(
  r1.activity.some(x => x.item.label === "Engineering Kick-Off"),
  '"kick" must surface "Engineering Kick-Off" in the Activities group'
);
assert.strictEqual(r1.activity[0] && r1.activity[0].fields[0], "label",
  "activity hit matched via label field");

// 2) "EPM" → Attributes group, matched field Responsible.
const r2 = run("EPM");
assert.ok(r2.attr.length >= 1, '"EPM" must produce an Attributes hit');
assert.ok(
  r2.attr.some(x => x.fields.includes("Responsible")),
  '"EPM" attr hit must name the Responsible field'
);

// 3) "management" → Pages group with the diagram title.
const r3 = run("management");
assert.ok(
  r3.page.some(x => x.item.label === "Project Management"),
  '"management" must surface the "Project Management" page'
);

// 4) Below-minimum query returns nothing.
const r4 = run("k");
assert.strictEqual(
  r4.page.length + r4.activity.length + r4.attr.length, 0,
  "queries shorter than 2 chars must return no results"
);

// 5) Cross-diagram dedupe: same label in N diagrams → N rows; a node appears once.
const eko = run("Engineering Kick-Off").activity
  .filter(x => x.item.label === "Engineering Kick-Off");
assert.strictEqual(eko.length, 3,
  '"Engineering Kick-Off" appears in 3 diagrams → 3 distinct activity rows');
const seen = new Set();
eko.forEach(x => {
  const key = x.item.diagramKey + "/" + x.item.nodeId;
  assert.ok(!seen.has(key), "each (diagram,node) row must be unique");
  seen.add(key);
});

console.log("✓ _verify_search: label/attr/title match, 2-char floor, cross-diagram dedupe");
