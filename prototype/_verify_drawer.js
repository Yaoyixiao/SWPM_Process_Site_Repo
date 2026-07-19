/*  prototype/_verify_drawer.js
 *  Smoke-test for the node-detail drawer — no DOM needed.
 *
 *  Loads DIAGRAMS (the way _verify.js does), then `require()`s renderer.js —
 *  which exposes Renderer._drawer.buildBody without booting a DOM. Builds the
 *  drawer body for the PTC Integrity Project Creation node and asserts:
 *    1. Four fields rendered in insertion order with label-key `_` → space.
 *    2. External_Wiki_Link splits on \n into exactly 2 anchors whose hrefs
 *       equal the trimmed URL parts.
 *    3. Description contains no <a> (text-only rendering).
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Load diagrams.js the same way _verify.js does (so DIAGRAMS lives on global).
let code = fs.readFileSync(path.join(__dirname, "diagrams.js"), "utf8");
code = code.replace("const DIAGRAMS =", "global.DIAGRAMS =");
eval(code);

// require()s renderer.js; the boot guard `if (typeof document !== ...)` keeps
// it from touching DOM, while exposing Renderer._drawer.buildBody.
const Renderer = require("./renderer.js");
const build = Renderer._drawer.buildBody;

const key = "JDH2YTP4nvJb3EjhgnOv";
const d = global.DIAGRAMS[key];
assert.ok(d, `diagram ${key} not found`);

const node = d.nodes.find(n => n.id === "ip_ptc");
assert.ok(node, "ip_ptc node not found in diagram");
assert.ok(node.attrs, "ip_ptc has no attrs");

const html = build(node, d, key);
assert.ok(typeof html === "string" && html.length > 0, "empty body");

// 1) Field labels in insertion order, `_` replaced by space.
const labels = [...html.matchAll(/drawer-field-label">([^<]*)</g)].map(m => m[1]);
assert.deepStrictEqual(
  labels,
  ["Responsible", "Support", "External Wiki Link", "Description"],
  "labels must be in insertion order with underscores replaced by space"
);

// 2) External_Wiki_Link must produce two anchors whose hrefs equal the URL parts.
const parts = node.attrs.External_Wiki_Link.split("\n").map(s => s.trim());
assert.strictEqual(parts.length, 2, "test data: expected 2 URLs in External_Wiki_Link");

const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
assert.strictEqual(hrefs.length, 2, `expected exactly 2 anchors, got ${hrefs.length}`);
assert.strictEqual(hrefs[0], parts[0], "first anchor href must equal first URL part");
assert.strictEqual(hrefs[1], parts[1], "second anchor href must equal second URL part");

// 3) Description field must not auto-link plain text (current data has no URLs).
const descSegment = html.split('drawer-field-label">Description<')[1] || "";
assert.ok(
  !/<a[\s>]/.test(descSegment),
  "Description field must not contain <a> tags (current data is plain text)"
);

// 4) Numeric index markers in front of each field (01, 02, 03, 04).
const idxs = [...html.matchAll(/drawer-field-idx">(\d{2})</g)].map(m => m[1]);
assert.deepStrictEqual(idxs, ["01", "02", "03", "04"], "numeric index markers");

// 5) Each anchor opens in a new tab (Q16).
const targets = [...html.matchAll(/target="([^"]*)"/g)].map(m => m[1]);
assert.ok(targets.every(t => t === "_blank"), "all anchors must target=_blank");

console.log("✓ _verify_drawer: 4 fields in order, 2 wiki anchors, Description un-linked");
