# Plan: 清理 prototype — 只留 8 条 DRAWIO 明出边 + 简化路由

## 上下文

用户对照 `Input/PIC/` 里新放的截图（3 张图的 DRAWIO 原图 + 原型当前渲染），指出了三处问题：

1. **臆造连线**：上一轮实施给 5 条边加了 `inferred: true`（如 Plan Project → Execute Project Delivery），但 DRAWIO XML 里**根本不存在**这些连线，是凭"上下两行同列"推断出来的假连线。
2. **路径越界**：SW Configuration Setup 里 `sc_e1` 用了 `sideRoute: true` 走 U 形，但 `rightX = t.cx + tw + 40` 没夹到画布内（`totalW=640`，`rightX≈660`），超出画布。
3. **入点 + 箭头错位**：SW Technical Solution 的 `st_e3`（col 2 行 2 → col 1 行 3，向左下），路由代码走"M(cx,by) V detourY H t.cx V t.top"。最后一段从 `detourY` 升到 `t.top`（方向 UP），箭头跟着翻向，**贴反了**；箭头也因此看不到。

用户答复：
- **边源真实**："只保留 XML 明出边的 8 条" — 删 5 条推断 + 6 条孤立（orphans），最终只剩 8 条 XML 完全明确的边。
- **路由松紧**："别管过于严格，只要业务可看" — 不追 DRAWIO 神级还原，只要"边都在、有箭头、不出画布"即可。

**额外要求**：调用子代理之前**先备份当前 prototype**。

---

## 推荐方案

### 0. 备份（在动任何文件之前）

主代理直接 `cp` 一份时间戳副本：

```bash
cp -r "prototype" "prototype.bak-$(date +%Y%m%d-%H%M%S)"
```

（Windows 等价：`xcopy /E /I /Y "prototype" "prototype.bak-YYYYMMDD-HHMMSS"`）

预期产物：`prototype.bak-20260517-XXXXXX/` 与 `prototype/` 内容完全一致。

### 1. diagrams.js — 数据收敛到 8 条 XML 明出边

每个图只有 source/target 都明确出现在 DRAWIO XML 里的边才保留。**最终 8 条**：

| 图 | XML 明出边数 | 保留的边 ID |
|---|---|---|
| Project Management | 1 | `e_ko_init` |
| Initiate Project | 2 | `ip_e1`, `ip_e2` |
| SW Configuration Setup | 2 | `sc_e1`, `sc_e2` |
| SW Technical Solution | 3 | `st_e1`, `st_e2`, `st_e3` |

**删除清单**（共 11 条）：
- 4 条 PM 推断边：`e_init_plan`, `e_plan_exe`, `e_rel_prob`, `e_prob_close`
- 1 条 Initiate 推断边：`0AgJOyBHqVQeRlazFOzS-17`
- 6 条孤儿边（3 张图都有）：
  - IP：`0AgJOyBHqVQeRlazFOzS-18, -19, -20`
  - SWConfig：`OIkXa_31-ZXwuiXeRIxq-21, -22, -23`

### 2. renderer.js — 路由大幅简化

现在 `routeEdge` 有 ~85 行（`sideRoute` 分支、`shouldUseSideRoute` 自动检测、孤儿 pin 分支、legacy `e.target` 防御、向后 dx 走向），但**实际只需要 4 种 case**：

```js
function routeEdge(s, t /*, edge*/) {
  const dx = t.cx - s.cx;
  const dy = t.cy - s.cy;

  // ① 同列
  if (Math.abs(dx) < 4) {
    return dy > 0
      ? `M ${s.cx} ${s.by} V ${t.top}`   // ↓ top→top, last segment ↓, arrow ↓
      : `M ${s.cx} ${s.top} V ${t.by}`;  // ↑ bot→bot, last segment ↑, arrow ↑
  }

  // ② 同行
  if (Math.abs(dy) < 4) {
    return dx > 0
      ? `M ${s.rx} ${s.cy} H ${t.left}`   // → right, last segment →, arrow → into t.left
      : `M ${s.left} ${s.cy} H ${t.rx}`;  // ← left, last segment ←, arrow ← into t.right
  }

  // ③ 右下 (dx>0, dy>0)：从源 right 出口 → 横向到 target.left → 纵向到 target.top
  if (dx > 0 && dy > 0) return `M ${s.rx} ${s.cy} H ${t.left} V ${t.top}`;

  // ④ 左下 (dx<0, dy>0)：从源 left 出口 → 横向到 target.right → 纵向到 target.top
  if (dx < 0 && dy > 0) return `M ${s.left} ${s.cy} H ${t.rx} V ${t.top}`;

  // ⑤ 兜底（数据里不存在）：从中心画对角线
  return `M ${s.cx} ${s.cy} L ${t.cx} ${t.cy}`;
}
```

每个 case 的最后一段方向都让箭头方向正确（箭头指向目标盒子边缘内部）。

**可以删掉**：
- `shouldUseSideRoute()` 整个函数
- `sideRoute: true` 标志位（数据里不再有）
- `orphan-pin` 分支（孤儿边已删，不渲染 pin）
- legacy `e.target` 防御（不再用）

**路径越界防护**：简单 L 形天然不会越界（`H t.left` / `H t.rx` 都在画布范围内，节点矩形宽度固定）。SW Config Setup 的 `sc_e1` L 形在新逻辑下：`M s.rx s.cy H t.left V t.top`，其中 `s.rx = 100, s.cy = 95, t.left = 450, t.top = 265`，全在 `[0, 640]` 范围内。✓

**`stat-chip` 更新**：去掉 `orphan` 段（不再有），只显示 `total / real`。

**`buildHeaderChrome`**：去掉孤儿面包屑标记逻辑（不再有 `.has-orphan`）。

### 3. index.html — CSS 清理

保留 `stat-chip` 样式但去掉：
- `.breadcrumb a.has-orphan` 规则
- `.breadcrumb a.has-orphan::after` 规则
- `orphan-pin` 相关样式（如果有）

`stat-chip` 改为只显示 total + real 两段。

### 4. index.html — DOM 微调

`<span class="stat-chip" id="statChip">…</span>` 内容只填充 total / real，不再有 orphan 段。

### 5. 验证

```bash
cd prototype
node -c diagrams.js
node -c renderer.js
node _verify.js
```

`_verify.js` 由于不再有孤儿边，仍能跑通；输出会是每条边的 dx/dy，没有 orphan 行。

视觉验证（用户截图 vs 新渲染）：
- Project Management：只剩 1 条"Engineering Kick-Off → Initiate Project"横向箭头。
- Initiate Project：2 条同列向下，"Technical Solution → Engineering Kick-Off → Configuration Setup"。
- SW Configuration Setup：2 条 L 形（不再有 U 越界），全部在画布内。
- SW Technical Solution：3 条 L 形，其中 `st_e3` 从 SW Technical Solution 的左边出发 → 横向 → 顶端入 SW Baseline（修正后**有方头箭头**）。

---

## 关键文件

| 文件 | 改动 |
|---|---|
| `prototype.bak-XXXXXXXX/` | 新建，主代理 cp 复制当前 prototype |
| `prototype/diagrams.js` | 子代理 1：删除 11 条边 |
| `prototype/renderer.js` | 子代理 2：重写 `routeEdge` 为 5-case 简化版，删 `shouldUseSideRoute` / orphan-pin / `e.target` 防御 |
| `prototype/index.html` | 子代理 3：CSS 清理 + stat-chip 两段化 |

---

## 子代理实施分工

### 主代理（当前会话） — 调度 + 备份

1. **第一步**：`cp -r prototype prototype.bak-YYYYMMDD-HHMMSS` — 备份现有
2. 派子代理 1（数据）和子代理 2（渲染）— **并行**
3. 两者完成 → 派子代理 3（CSS / DOM）
4. 跑 `node _verify.js` 跑通
5. 让用户截图复核

### 子代理 1 — 数据（diagrams.js）
**唯一改动**：删 11 条边，保留 8 条 XML 明出边。
**约束**：
- 不动 `columns` / `colWidths` / `headerHeight` / `rowHeights` / `nodes`
- 删完后 `_verify.js` 跑通，且 DRILL-DOWN COHERENCE 仍 PASS
- **不动**其他任何文件

### 子代理 2 — 渲染（renderer.js）
**改动**：
- 重写 `routeEdge(s, t, edge)` 为 5-case 简化版（删 auto-detect、sideRoute 强制分支、orphan-pin、legacy 防御）
- 删 `shouldUseSideRoute` 整个函数
- `updateStatChip` 改为只算 total + real
- 删 `e.target` legacy guard
- 删 `buildCanvas` 中的孤儿 pin 分支
**约束**：
- 与现有 8 条边渲染兼容（每条边的 path 是其中一种 case，期望视觉一致）
- 不动 `orphan-pin`/`has-orphan` 这些 CSS class（由子代理 3 清）
- `console.log` 的 QA 输出仍保留，但去掉 orphan / inferred 两段统计（已无意义）

### 子代理 3 — 样式（index.html）
**改动**：
- 删 `.breadcrumb a.has-orphan` 块
- 删 index.html 中孤儿相关的 JS/CSS 引用（如果存在）
- 修改 `<span class="stat-chip" id="statChip">…</span>` 调用，使内容只显示 total + real（注意：JS 是子代理 2 改的，这里只清样式与冗余）
**约束**：
- 不改 JS 逻辑，只动样式/静态结构
- 不动 mount / render / 路由

### 顺序
1. 主代理备份
2. 子代理 1 & 2 并行
3. 子代理 3（依赖 1+2 完成）
4. 主代理跑 `node _verify.js`

---

## 验收（终端 + 视觉）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `ls prototype.bak-*/` | 与原 `prototype/` 文件大小完全一致 |
| 2 | `node _verify.js` | 4 张图，恰好 8 条边（5 PM 中 1 + initiate 2 + swconfig 2 + swtech 3 不含 orphan）。drill-down 仍 PASS |
| 3 | 浏览器打开 PM | 只看到 `Engineering Kick-Off → Initiate Project` 一条横向箭头 |
| 4 | 浏览器打开 Initiate Project | 2 条同列向下箭头（Technical Solution → Kick-Off → Config Setup） |
| 5 | 浏览器打开 SW Config Setup | 2 条 L 形，全部**在画布内**（不再越界） |
| 6 | 浏览器打开 SW Tech Solution | 3 条 L 形；`st_e3` 从 SW Technical Solution 左边出发，箭头**方块朝下**进入 SW Baseline 顶部 |
| 7 | 顶部 stat-chip | 只显示 `total: 8 · real: 8`（initiate 显示 `total: 2`，swconfig 显示 `total: 2`，etc.） |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 备份失败导致后续无法回滚 | 主代理先 `cp`，再 `ls` 校验存在再派子代理 |
| 子代理误删了真实数据 | 子代理 1 在 PR 中保留所有 `nodes` / `columns` / `colWidths` 一字不动 |
| 简化后的路由 case 漏了极端几何 | 兜底 case 5 (`M ... L ...`) 画直线，**永远不会**扔 `console.error` |

---

## English Summary

The user wants the prototype to be a faithful 1:1 mirror of what's literally in the DRAWIO XML — no fabricated connections. Three issues to fix: (a) 5 `inferred: true` edges that we made up (Plan→Execute etc.); (b) sideRoute U-paths overflowing canvas (SW Config Setup sc_e1); (c) backward-diagonal edges in SW Tech Solution entering target from wrong side and missing arrowhead (st_e3). User confirmed: only keep the 8 XML-explicit edges, drop the 11 inferred+orphan ones; simplify routing to "just make it readable" — no fancy sideRoute or auto-detection. Plan: backup first, then parallel sub-agents for data and renderer simplification, then a CSS sub-agent, then `_verify.js` regression. Final state has 8 edges with simple L/U paths that always end with the last segment direction matching the arrow direction.

---

## 实施顺序

1. **主代理**：`cp -r prototype prototype.bak-YYYYMMDD-HHMMSS` 备份
2. **主代理**：同时派子代理 1 (数据) + 子代理 2 (渲染) — 并行
3. 两者完成 → **主代理**：派子代理 3 (CSS/DOM)
4. **主代理**：跑 `node _verify.js`，比对边数应为 PM=1 / Init=2 / SWC=2 / SWT=3
5. **用户**：截图复核 4 张图，重点看 SW Tech Solution 的 st_e3 和 SW Config Setup 的边界
