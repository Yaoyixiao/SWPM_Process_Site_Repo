// Quick logic test of renderer geometry — runs in Node, no DOM.
// Loads diagrams.js, computes all node positions and edge paths, prints summary.

const fs = require("fs");
const path = require("path");

// Read source, expose `const DIAGRAMS = ...` as a global so we can read it.
let code = fs.readFileSync(path.join(__dirname, "diagrams.js"), "utf8");
code = code.replace("const DIAGRAMS =", "global.DIAGRAMS =");
eval(code);

const NODE_W = 160, NODE_H = 60;
const ELLIPSE_W = 30, ELLIPSE_H = 30;

function pos(node, d, colX, rowY) {
  const w = node.kind === "ellipse" ? ELLIPSE_W : NODE_W;
  const h = node.kind === "ellipse" ? ELLIPSE_H : NODE_H;
  const colW = d.colWidths[node.col];
  const rowH = d.rowHeights[node.row];
  return {
    left: (node.dx != null)
      ? colX[node.col] + node.dx
      : colX[node.col] + (colW - w) / 2,
    top:  d.headerHeight + rowY[node.row] + (rowH - h) / 2,
    w, h,
    cx: 0, cy: 0, rx: 0, by: 0,
  };
}

function summary(key) {
  const d = global.DIAGRAMS[key];
  const colX = [0]; for (let i = 1; i < d.colWidths.length; i++) colX.push(colX[i-1] + d.colWidths[i-1]);
  const rowY = [0]; for (let i = 1; i < d.rowHeights.length; i++) rowY.push(rowY[i-1] + d.rowHeights[i-1]);
  const totalW = d.colWidths.reduce((a, b) => a + b, 0);
  const totalH = d.headerHeight + d.rowHeights.reduce((a, b) => a + b, 0);

  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`  ${d.title}  (id=${key})`);
  console.log(`  columns: ${d.columns.join(" | ")}`);
  console.log(`  canvas:  ${totalW} × ${totalH}`);
  console.log(`────────────────────────────────────────────────────`);
  d.nodes.forEach(n => {
    const p = pos(n, d, colX, rowY);
    const drill = n.drillTo ? ` → drills to ${n.drillTo}` : "";
    const ell = n.kind === "ellipse" ? " (ellipse)" : "";
    console.log(`  ${n.id.padEnd(20)} "${n.label}"${ell}  cell=[col=${n.col},row=${n.row}]  pos=(${p.left.toFixed(0)},${p.top.toFixed(0)})${drill}`);
  });
  console.log(`  ── edges (${d.edges.length}) ──`);
  d.edges.forEach(e => {
    // Orphan edges have null endpoints — print separately, skip geometry.
    if (e.from == null && e.to == null) {
      console.log(`  ${e.id.padEnd(18)} (orphan — row ${e.originRow})  ${e.reason || ""}`);
      return;
    }
    const sN = d.nodes.find(n => n.id === e.from);
    const tN = d.nodes.find(n => n.id === e.to);
    const sP = pos(sN, d, colX, rowY);
    const tP = pos(tN, d, colX, rowY);
    const dx = tP.left - sP.left;
    const dy = tP.top  - sP.top;
    const tag = e.sideRoute ? "  [sideRoute]" : e.inferred ? "  [inferred]" : "";
    console.log(`  ${e.id.padEnd(18)} ${e.from.padEnd(18)} → ${e.to.padEnd(18)}  dx=${dx} dy=${dy}${tag}`);
  });
}

Object.keys(global.DIAGRAMS).forEach(summary);

// Drill-down closure: ensure every drillTo target exists
console.log(`\n════════════════════════════════════════════════════`);
console.log(`  DRILL-DOWN COHERENCE CHECK`);
console.log(`────────────────────────────────────────────────────`);
let ok = true;
for (const k of Object.keys(global.DIAGRAMS)) {
  global.DIAGRAMS[k].nodes.forEach(n => {
    if (n.drillTo && !global.DIAGRAMS[n.drillTo]) {
      console.log(`  ✗ ${k}.${n.id} drills to missing diagram "${n.drillTo}"`);
      ok = false;
    }
  });
}
console.log(`  ${ok ? "✓ all drill-downs resolve to a real diagram" : "✗ integrity errors above"}`);

// Attrs shape check — drawer feature. Every `attrs` (if present) must be a
// plain string→string map (insertion order preserved by JS engines).
console.log(`\n════════════════════════════════════════════════════`);
console.log(`  ATTRS SHAPE CHECK`);
console.log(`────────────────────────────────────────────────────`);
let attrsOk = true;
for (const k of Object.keys(global.DIAGRAMS)) {
  global.DIAGRAMS[k].nodes.forEach(n => {
    if (n.attrs === undefined) return;     // absent is OK
    if (typeof n.attrs !== "object" || n.attrs === null || Array.isArray(n.attrs)) {
      console.log(`  ✗ ${k}.${n.id} attrs is ${Array.isArray(n.attrs) ? "array" : typeof n.attrs}, expected plain object`);
      attrsOk = false;
      return;
    }
    for (const [ak, av] of Object.entries(n.attrs)) {
      if (typeof av !== "string") {
        console.log(`  ✗ ${k}.${n.id}.${ak} is ${typeof av}, expected string`);
        attrsOk = false;
      }
    }
  });
}
console.log(`  ${attrsOk ? "✓ all attrs are plain string maps" : "✗ attrs shape errors above"}`);
process.exit(attrsOk && ok ? 0 : 1);
