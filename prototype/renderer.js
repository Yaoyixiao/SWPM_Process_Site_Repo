/*  prototype/renderer.js
 *  Render pipeline + interactions for the JS-driven BPMN viewer.
 *  Consumes window.DIAGRAMS (from diagrams.js).
 *
 *  Public API:
 *    Renderer.mount()                          — boot
 *    Renderer.render(diagramKey)               — switch to a diagram
 *
 *  Coordinate system inside the canvas (id="canvas"):
 *    .matrix has CSS grid with gridTemplateColumns/gridTemplateRows matching
 *    colWidths / rowHeights. headerHeight is a top row (gray-gradient).
 *    Activities are absolutely positioned at (left, top) = (colX[col] +
 *    (colW-160)/2, headerHeight + rowY[row] + (rowH-60)/2).
 */

(function () {
  "use strict";

  const NODE_W = 160, NODE_H = 60;
  const ELLIPSE_W = 30, ELLIPSE_H = 30;

  const Renderer = {};
  let _stack = [];          // breadcrumb of diagram keys (root → current)
  let _selectedNodeId = null;   // id of node whose drawer is currently open (or null)
  let _els = null;              // cached DOM refs, populated in initDrawer()
  let _zoom = 1;                // current zoom level (1 = 100%)
  const ZOOM_MIN = 0.25, ZOOM_MAX = 4, ZOOM_STEP = 1.2;
  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

  // ─── Boot ─────────────────────────────────────────────────────────────
  Renderer.mount = function () {
    buildLeftRail();
    initDrawer();
    initZoom();
    // Try to derive root (the diagram with no parent). Fallback: first key.
    const root = pickRoot() || Object.keys(DIAGRAMS)[0];
    Renderer.render(root);

    // QA summary of the currently-rendered diagram's edges.
    const curKey = _stack[_stack.length - 1] || pickRoot() || Object.keys(DIAGRAMS)[0];
    const cur = DIAGRAMS[curKey];
    if (cur) {
      const real = cur.edges.filter(e => e.from && e.to);
      console.log(`[QA] ${cur.title} — total: ${cur.edges.length} · real: ${real.length}`);
      updateStatChip(cur);
    }
  };

  function pickRoot() {
    for (const key of Object.keys(DIAGRAMS)) {
      const chain = new Set();
      let cursor = key;
      let hops = 0;
      while (cursor && hops++ < 100) {
        // Cycle guard: if a drill chain (A→B→A) forms, stop at the first repeat.
        if (chain.has(cursor)) break;
        chain.add(cursor);
        // root has no incoming edges (no other node has drillTo === cursor)
        const incoming = Object.values(DIAGRAMS).some(other =>
          other.nodes.some(n => n.drillTo === cursor));
        if (!incoming) return cursor;
        // pick the would-be parent of cursor (one that has drillTo === cursor)
        const parent = Object.values(DIAGRAMS).find(other =>
          other.nodes.some(n => n.drillTo === cursor));
        cursor = parent ? parent.id : null;
      }
    }
    return null;
  }

  // ─── Render entry ─────────────────────────────────────────────────────
  Renderer.render = function (diagramKey) {
    const d = DIAGRAMS[diagramKey];
    if (!d) { console.error("Unknown diagram:", diagramKey); return; }

    // Any diagram switch closes the drawer (single chokepoint for left-rail /
    // breadcrumb / drill). Reset selection before rebuilding the canvas so the
    // next click is guaranteed to open, not no-op.
    closeDrawer();
    // Reset zoom to 100% on every diagram switch.
    _zoom = 1; applyZoom();

    // Update breadcrumb stack: replace trailing same key, else push.
    if (_stack[_stack.length - 1] !== diagramKey) {
      const existing = _stack.indexOf(diagramKey);
      if (existing >= 0) _stack = _stack.slice(0, existing + 1);
      else _stack.push(diagramKey);
    }

    buildHeaderChrome(d, diagramKey);
    buildCanvas(d, diagramKey);
    highlightLeftRail(diagramKey);
    document.title = `${d.title} — Process Viewer`;
    updateStatChip(d);
  };

  // ─── Header / breadcrumb / title ──────────────────────────────────────
  function buildHeaderChrome(d, key) {
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = d.title;

    const crumb = document.getElementById("breadcrumb");
    if (crumb) {
      crumb.innerHTML = "";
      const items = [
        { label: "Process", href: "#root", key: null },
        { label: "Workflows and Activities", href: "#root", key: null }
      ];
      // Append actual diagram trail
      _stack.forEach((k, idx) => {
        items.push({ label: DIAGRAMS[k].title, key: k });
      });

      items.forEach((it, i) => {
        const a = document.createElement(it.key ? "a" : "span");
        a.textContent = it.label;
        a.style.cursor = it.key ? "pointer" : "default";
        if (it.key) a.dataset.key = it.key;
        if (it.key && it.key !== key) {
          a.addEventListener("click", () => Renderer.render(it.key));
        } else if (it.key === key) {
          a.style.color = "var(--text)";
          a.style.fontWeight = "500";
        }
        crumb.appendChild(a);
        if (i < items.length - 1) {
          const sep = document.createElement("span");
          sep.className = "sep";
          sep.textContent = "›";
          crumb.appendChild(sep);
        }
      });
      // Mark current segment
      const cur = crumb.querySelector(`a[data-key="${CSS.escape(key)}"]`);
      if (cur) {
        // (no has-orphan toggle — orphans no longer exist)
      }
    }
  }

  // ─── Left rail ────────────────────────────────────────────────────────
  function buildLeftRail() {
    const rail = document.getElementById("leftRail");
    if (!rail) return;
    rail.innerHTML = "";

    const heading = document.createElement("div");
    heading.className = "left-rail-heading";
    heading.textContent = "Process Pages";
    rail.appendChild(heading);

    Object.values(DIAGRAMS).forEach(d => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "left-rail-item";
      btn.dataset.key = findKeyByTitle(d.title);
      btn.innerHTML = `<span class="dot"></span><span class="label">${escapeHtml(d.title)}</span>`;
      btn.addEventListener("click", () => navigateFresh(btn.dataset.key));
      rail.appendChild(btn);
    });
  }
  function navigateFresh(key) {
    _stack = [key];
    Renderer.render(key);
  }
  function findKeyByTitle(title) {
    for (const k of Object.keys(DIAGRAMS)) if (DIAGRAMS[k].title === title) return k;
    return null;
  }
  function highlightLeftRail(key) {
    document.querySelectorAll(".left-rail-item").forEach(el => {
      el.classList.toggle("active", el.dataset.key === key);
    });
  }

  // ─── Canvas build ─────────────────────────────────────────────────────
  function buildCanvas(d, key) {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    // Geometry
    const totalW = d.colWidths.reduce((a, b) => a + b, 0);
    const totalH = d.headerHeight + d.rowHeights.reduce((a, b) => a + b, 0);
    const colX = [0];
    for (let i = 1; i < d.colWidths.length; i++) colX.push(colX[i-1] + d.colWidths[i-1]);
    const rowY = [0];
    for (let i = 1; i < d.rowHeights.length; i++) rowY.push(rowY[i-1] + d.rowHeights[i-1]);

    canvas.style.width  = totalW + "px";
    canvas.style.height = totalH + "px";

    // Build inner markup
    canvas.innerHTML = "";

    // 1) Header row (gray gradient cells)
    const header = document.createElement("div");
    header.className = "canvas-header";
    header.style.display = "grid";
    header.style.gridTemplateColumns = d.colWidths.map(w => w + "px").join(" ");
    d.columns.forEach((label, i) => {
      const cell = document.createElement("div");
      cell.className = "h-cell";
      cell.style.width = d.colWidths[i] + "px";
      cell.textContent = label;
      header.appendChild(cell);
    });
    canvas.appendChild(header);

    // 2) Body rows with grid cells
    d.rowHeights.forEach((rh, r) => {
      const row = document.createElement("div");
      row.className = "canvas-row";
      row.style.display = "grid";
      row.style.gridTemplateColumns = d.colWidths.map(w => w + "px").join(" ");
      row.style.height = rh + "px";
      d.colWidths.forEach((cw, c) => {
        const cell = document.createElement("div");
        cell.className = "col";
        cell.style.width = cw + "px";
        cell.style.height = rh + "px";
        row.appendChild(cell);
      });
      canvas.appendChild(row);
    });

    // 3) Activity nodes (absolutely positioned)
    const positions = {};
    const nodesById = {};
    d.nodes.forEach(n => {
      const pos = positionNode(n, d, colX, rowY);
      positions[n.id] = pos;
      nodesById[n.id] = n;
      const el = document.createElement("div");
      el.className = "activity";
      if (n.kind === "ellipse") el.classList.add("ellipse");
      el.style.left = pos.left + "px";
      el.style.top  = pos.top + "px";
      el.style.width  = (n.kind === "ellipse" ? ELLIPSE_W : NODE_W) + "px";
      el.style.height = (n.kind === "ellipse" ? ELLIPSE_H : NODE_H) + "px";
      el.dataset.nodeId = n.id;

      if (n.label) {
        const text = document.createElement("span");
        text.className = "label";
        text.textContent = n.label;
        el.appendChild(text);
      }

      if (n.drillTo) {
        el.classList.add("drillable");
        el.dataset.drill = n.drillTo;
        const cue = document.createElement("span");
        cue.className = "drill-cue";
        cue.textContent = "↗";
        el.appendChild(cue);
        const target = DIAGRAMS[n.drillTo];
        if (target) el.title = "Open: " + target.title;
        // Drill cue is a visual hint; actual drill lives in the drawer header
        // (openDrawer → drill button) so a node click always opens the drawer.
      }
      el.addEventListener("click", () => openDrawer(n, d, key));

      canvas.appendChild(el);
    });

    // 4) SVG layer for edges
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "canvas-svg");
    svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
    svg.setAttribute("width", totalW);
    svg.setAttribute("height", totalH);
    canvas.appendChild(svg);

    // arrowhead marker
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `
      <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="#819BB0"/>
      </marker>`;
    svg.appendChild(defs);

    // edges
    d.edges.forEach(e => {
      const s = positions[e.from], t = positions[e.to];
      if (!s || !t) {
        console.warn("Edge references unknown node:", e);
        return;
      }
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "seg");
      path.setAttribute("d", routeEdge(s, t));
      path.setAttribute("marker-end", "url(#ah)");
      svg.appendChild(path);
    });

    // Scroll canvas back to top-left for the new diagram
    const card = canvas.closest(".matrix-card");
    if (card) { card.scrollLeft = 0; card.scrollTop = 0; }
  }

  // ─── Zoom / Fit-to-page / Pan ──────────────────────────────────────────
  function initZoom() {
    const card = document.querySelector(".matrix-card");
    const canvas = document.getElementById("canvas");
    if (!card || !canvas) return;
    const zoomIn = document.getElementById("zoomIn");
    const zoomOut = document.getElementById("zoomOut");
    const zoomFit = document.getElementById("zoomFit");
    const zoomRatio = document.getElementById("zoomRatio");
    if (zoomIn) zoomIn.addEventListener("click", () => setZoom(_zoom * ZOOM_STEP));
    if (zoomOut) zoomOut.addEventListener("click", () => setZoom(_zoom / ZOOM_STEP));
    if (zoomFit) zoomFit.addEventListener("click", fitToPage);
    if (zoomRatio) zoomRatio.addEventListener("change", e => setZoom(parseFloat(e.target.value)));
    card.addEventListener("wheel", onWheelZoom, { passive: false });
    initPan(card);
    card.classList.add("pannable");
    applyZoom();
  }

  function applyZoom() {
    const canvas = document.getElementById("canvas");
    if (canvas) canvas.style.zoom = _zoom;
    const pctEl = document.getElementById("zoomPct");
    if (pctEl) pctEl.textContent = Math.round(_zoom * 100) + "%";
    const sel = document.getElementById("zoomRatio");
    if (sel) {
      const hit = ZOOM_LEVELS.find(o => Math.abs(o - _zoom) < 0.001);
      sel.value = hit != null ? String(hit) : "";
    }
    const out = document.getElementById("zoomOut");
    const inb = document.getElementById("zoomIn");
    if (out) out.disabled = _zoom <= ZOOM_MIN + 1e-6;
    if (inb) inb.disabled = _zoom >= ZOOM_MAX - 1e-6;
  }

  function setZoom(z) {
    _zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    applyZoom();
  }

  function fitToPage() {
    const card = document.querySelector(".matrix-card");
    const canvas = document.getElementById("canvas");
    if (!card || !canvas) return;
    const PAD = 24;
    // Read intrinsic (un-zoomed) canvas size from inline width/height set by buildCanvas
    const contentW = parseFloat(canvas.style.width)  || canvas.offsetWidth  / _zoom;
    const contentH = parseFloat(canvas.style.height) || canvas.offsetHeight / _zoom;
    const scale = Math.min(
      (card.clientWidth  - PAD) / contentW,
      (card.clientHeight - PAD) / contentH
    );
    setZoom(scale);
    card.scrollLeft = 0; card.scrollTop = 0;
  }

  let _wheelPending = false;
  function onWheelZoom(e) {
    if (!e.ctrlKey) return;   // let normal scroll pass through
    e.preventDefault();       // block browser-level page zoom
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    if (_wheelPending) return;
    _wheelPending = true;
    requestAnimationFrame(() => { _wheelPending = false; setZoom(_zoom * factor); });
  }

  function initPan(card) {
    let panning = false, sx = 0, sy = 0, sl = 0, st = 0;
    card.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest(".activity")) return; // preserve node click → drawer
      panning = true; sx = e.clientX; sy = e.clientY;
      sl = card.scrollLeft; st = card.scrollTop;
      card.setPointerCapture(e.pointerId);
      card.classList.add("panning");
    });
    card.addEventListener("pointermove", e => {
      if (!panning) return;
      card.scrollLeft = sl - (e.clientX - sx);
      card.scrollTop  = st - (e.clientY - sy);
    });
    const end = e => {
      if (!panning) return;
      panning = false;
      card.classList.remove("panning");
      try { card.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  // ─── Geometry helpers ─────────────────────────────────────────────────
  function positionNode(node, d, colX, rowY) {
    const isEll = node.kind === "ellipse";
    const w = isEll ? ELLIPSE_W : NODE_W;
    const h = isEll ? ELLIPSE_H : NODE_H;
    const colW = d.colWidths[node.col];
    const rowH = d.rowHeights[node.row];
    // Optional per-node dx: offset from the cell's left edge. Used when a single
    // swimlane cell holds two side-by-side activities, or to keep vertical edge
    // chains straight. Falls back to horizontal centering when absent.
    const left = (node.dx != null)
      ? colX[node.col] + node.dx
      : colX[node.col] + (colW - w) / 2;
    const top  = d.headerHeight + rowY[node.row] + (rowH - h) / 2;
    return { left, top, w, h,
             cx: left + w/2, cy: top + h/2,
             rx: left + w,  by: top + h };
  }

  // ─── Edge routing (orthogonal, simple L-routing) ─────────────────────
  function routeEdge(s, t /*, edge*/) {
    const dx = t.cx - s.cx;
    const dy = t.cy - s.cy;

    // ① Same column — vertical down or up
    if (Math.abs(dx) < 4) {
      return dy > 0
        ? `M ${s.cx} ${s.by} V ${t.top}`   // top→top, last seg ↓, arrow ↓
        : `M ${s.cx} ${s.top} V ${t.by}`;  // bot→bot, last seg ↑, arrow ↑
    }

    // ② Same row — sideways left or right
    if (Math.abs(dy) < 4) {
      return dx > 0
        ? `M ${s.rx} ${s.cy} H ${t.left}`   // → src-right → t-left, last seg →, arrow → into t.left
        : `M ${s.left} ${s.cy} H ${t.rx}`;  // ← src-left → t-right, last seg ←, arrow ← into t.right
    }

    // ③ Forward diagonal (dx>0, dy>0): exit right, go right, go down
    if (dx > 0 && dy > 0) return `M ${s.rx} ${s.cy} H ${t.left} V ${t.top}`;

    // ④ Backward diagonal (dx<0, dy>0): exit left, go left, go down
    if (dx < 0 && dy > 0) return `M ${s.left} ${s.cy} H ${t.rx} V ${t.top}`;

    // ⑤ Diagonal target-above scenarios — exit from bottom (away from target), approach from below
    if (dx > 0 && dy < 0) return `M ${s.rx} ${s.cy} H ${t.left} V ${t.by}`;
    if (dx < 0 && dy < 0) return `M ${s.left} ${s.cy} H ${t.rx} V ${t.by}`;

    // ⑥ Fallback (shouldn't occur)
    return `M ${s.cx} ${s.cy} L ${t.cx} ${t.cy}`;
  }

  // ─── Util ─────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  // ─── Drawer ──────────────────────────────────────────────────────────
  // Side panel that opens on node click. Lives outside the .app grid so it
  // can slide over the right rail. State is module-local (_selectedNodeId,
  // _els) — closed/cleared on any diagram switch.

  function initDrawer() {
    _els = {
      drawer:   document.getElementById("drawer"),
      eyebrow:  document.getElementById("drawerEyebrow"),
      title:    document.getElementById("drawerTitle"),
      sub:      document.getElementById("drawerSub"),
      body:     document.getElementById("drawerBody"),
      drill:    document.getElementById("drawerDrill"),
      closeBtn: document.getElementById("drawerClose"),
      app:      document.querySelector(".app"),
    };
    if (!_els.drawer) return;

    _els.closeBtn.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && _selectedNodeId) closeDrawer();
    });

    document.addEventListener("click", (e) => {
      if (!_selectedNodeId) return;
      if (e.target.closest(".drawer")) return;     // click inside drawer
      if (e.target.closest(".activity")) return;   // click on a node (handled by node)
      closeDrawer();
    });
  }

  function openDrawer(node, d, key) {
    if (!_els || !_els.drawer) return;
    // Same node re-click = NO-OP (Q14). Skips re-render flicker.
    if (_selectedNodeId === node.id) return;

    _selectedNodeId = node.id;

    // Move .selected ring to the new node
    document.querySelectorAll(".activity.selected")
      .forEach(el => el.classList.remove("selected"));
    const nodeEl = document.querySelector(
      `.activity[data-node-id="${CSS.escape(node.id)}"]`);
    if (nodeEl) nodeEl.classList.add("selected");

    // Eyebrow (PTC-style document index)
    const diagramTail = key.slice(-4).toUpperCase();
    const nodeTail = node.id.split(/[-_]/).pop().toUpperCase().slice(-3);
    _els.eyebrow.textContent = diagramTail + " · " + nodeTail;

    _els.title.textContent = node.label || "(unnamed)";
    _els.sub.textContent = d.title + " · col " + node.col + ", row " + node.row;

    // Drill button visibility
    if (node.drillTo && DIAGRAMS[node.drillTo]) {
      _els.drill.hidden = false;
      _els.drill.onclick = () => Renderer.render(node.drillTo);
    } else {
      _els.drill.hidden = true;
      _els.drill.onclick = null;
    }

    // Body swap with brief opacity fade (re-select polish)
    _els.body.style.opacity = "0";
    requestAnimationFrame(() => {
      _els.body.innerHTML = buildDrawerBody(node, d, key);
      _els.body.style.opacity = "1";
    });

    _els.drawer.classList.add("open");
    _els.drawer.setAttribute("aria-hidden", "false");
    _els.app.classList.add("drawer-open");
  }

  function closeDrawer() {
    if (!_els || !_els.drawer) return;
    _els.drawer.classList.remove("open");
    _els.drawer.setAttribute("aria-hidden", "true");
    _els.app.classList.remove("drawer-open");
    document.querySelectorAll(".activity.selected")
      .forEach(el => el.classList.remove("selected"));
    _selectedNodeId = null;
  }

  // attrEsc keeps '&' so emitted href equals the raw URL (smoke-test relies on this).
  function attrEsc(s) {
    return String(s).replace(/"/g, "&quot;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
  }

  // For URL-shaped text inside Description: emit <a target="_blank"> spans.
  function autolink(text) {
    const re = /https?:\/\/\S+|onenote:\S+/g;
    let out = "", last = 0, m;
    while ((m = re.exec(text))) {
      out += escapeHtml(text.slice(last, m.index)).replace(/\n/g, "<br>");
      out += '<a href="' + attrEsc(m[0]) +
             '" target="_blank" rel="noopener noreferrer" class="drawer-link">' +
             escapeHtml(m[0]) + '</a>';
      last = re.lastIndex;
    }
    return out + escapeHtml(text.slice(last)).replace(/\n/g, "<br>");
  }

  // For values that are explicitly multi-link: split on \n, each is a chip.
  function renderLinkValue(value) {
    return String(value).split("\n").map(part => {
      const p = part.trim();
      if (/^(https?:\/\/|onenote:)/.test(p)) {
        return '<a href="' + attrEsc(p) +
               '" target="_blank" rel="noopener noreferrer" class="drawer-link">' +
               escapeHtml(p) + '</a>';
      }
      return '<span class="drawer-text">' + escapeHtml(p) + '</span>';
    }).join("");
  }

  // Build the drawer's body HTML. Pure; exported for Node smoke-test.
  function buildDrawerBody(node, d, key) {
    const attrs = node.attrs;
    if (!attrs || Object.keys(attrs).length === 0) {
      return '<div class="drawer-empty">' +
               '<div class="drawer-empty-head">No attributes</div>' +
               '<div class="drawer-empty-hint">This node has no DRAWIO properties. ' +
                 'Wrap the activity cell in <code>&lt;object&gt;</code> with custom ' +
                 'attributes to populate this drawer.</div>' +
             '</div>';
    }
    return Object.entries(attrs).map(([k, v], i) => {
      const label = escapeHtml(k.replace(/_/g, " "));
      const valHtml = (k === "Description") ? autolink(v) : renderLinkValue(v);
      const idx = String(i + 1).padStart(2, "0");
      return '<div class="drawer-field">' +
               '<span class="drawer-field-idx">' + idx + '</span>' +
               '<div>' +
                 '<div class="drawer-field-label">' + label + '</div>' +
                 '<div class="drawer-field-value">' + valHtml + '</div>' +
               '</div>' +
             '</div>';
    }).join("");
  }

  // Expose helpers so the Node-side smoke-test can call buildDrawerBody()
  // without booting a DOM.
  Renderer._drawer = { buildBody: buildDrawerBody, renderLinkValue, autolink };

  // Update the header edge-stat chip with total / real counts.
  function updateStatChip(d) {
    const chip = document.getElementById("statChip");
    if (!chip || !d) return;
    const total = d.edges.length;
    const real  = d.edges.filter(e => e.from && e.to).length;
    chip.innerHTML =
      `<span class="seg total"><span class="label">total</span><span class="num">${total}</span></span>` +
      `<span class="seg real"><span class="label">real</span><span class="num">${real}</span></span>`;
  }

  // Boot when DOM is ready. Guard so Node `require()` (used by _verify_drawer.js)
  // doesn't try to touch `document`.
  if (typeof window !== "undefined") window.Renderer = Renderer;
  if (typeof module !== "undefined" && module.exports) module.exports = Renderer;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", Renderer.mount);
    } else {
      Renderer.mount();
    }
  }
})();
