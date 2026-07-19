# Prototype 维护指南

> 这是 `prototype/` 目录的稳定 spec。将来：DRAWIO 文件新增 / 改动流程图、视觉 token 调整、形状修改，都按本指南调整。**所有"原则"部分（§5、§9）已收敛，不在下次接手时重新讨论。**

---

## §1. 这份代码是干什么的

读取 `Input/DRAWIO/*.drawio` 里的 BPMN 流程图（matrix-style：row × role column），用一个单文件 `prototype/` 把它渲染成**双击可开**的网页。纯静态、零依赖、`file://` 也能跑。

---

## §2. 架构

```
prototype/
├── index.html      ← 外壳 (chrome + CSS + canvas 挂载点 + 两个 <script>)
├── diagrams.js     ← 纯数据 (DIAGRAMS 常量)
├── renderer.js     ← 渲染管线 (routeEdge + buildCanvas + interactions)
├── _verify.js      ← Node 几何校验 (离屏运行，无 DOM)
└── HANDOFF.md      ← 本文件
```

**严格约束**：
- 三个 JS / HTML 文件**全部用普通 `<script>` 加载**（不用 `type="module"` —— `file://` 模式加载不到）。
- 无构建步骤 / 无打包 / 无 npm。
- 入口在 `index.html`：body → `<script src="diagrams.js">` → `<script src="renderer.js">`。DIAGRAMS 是 global，Renderer.mount() 在 DOMContentLoaded 时触发。

---

## §3. 视觉 token（设计语言）

### 颜色（精确 hex）

| Token | Hex | 用途 |
|---|---|---|
| `--bg` | `#f1f4f8` | 页面背景 |
| `--surface` | `#ffffff` | 卡片、抽屉 |
| `--text` | `#2a333e` | 正文 |
| `--text-muted` | `#819bb0` | 二级文本 + 箭头/连线 stroke |
| `--border` | `#e4e7ec` | 卡片描边 |
| `--border-soft` | `#e1e6ec` | disabled / 弱化 |
| `--brand-start` | `#609eeb` | 蓝色渐变起始（活动节点） |
| `--brand-end` | `#4690eb` | 蓝色渐变终止（活动节点 + .active） |
| `--header-grad-top` | `#ebeef3` | 表头渐变 |
| `--header-grad-bot` | `#d8dfe8` | 表头渐变 |
| `--accent-hover` | `#51acd3` | zoom 工具 hover |
| `--shadow-card` | `0 0 0 1px rgba(0,0,0,0.04)` | 卡片阴影 |

### 字体 + 尺寸

- 字体族：`'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, Arial, sans-serif`
- 基号：12px (正文) / 14px (nav, 标签)
- 节点尺寸：160×60 (activity rounded rect) / 30×30 (ellipse 终止符)
- 圆角：4px (活动节点 + 卡片 + 输入框)

---

## §4. 数据形状

```js
// diagrams.js
const DIAGRAMS = {
  "<diagramId>": {
    key: "kebab-key",           // 短 slug，左侧菜单显示
    title: "Process Management", // 显示在标题栏
    columns: ["Event", "SWPM"], // 角色列名（左到右）
    colWidths: [200, 220],     // px，每列宽度
    headerHeight: 35,           // px，表头行高
    rowHeights: [120, 110],     // px，每行高度
    nodes: [
      { id: "n_id", label: "Activity name", col: 1, row: 0 },
      { id: "n_end", label: "",          col: 1, row: 8, kind: "ellipse" },
      { id: "n_drill", label: "Drillable", col: 1, row: 1, drillTo: "<otherDiagramId>" },
      { id: "n_a", label: "Left node",  col: 2, row: 2, dx: 20 },   // ← 见 §4.1
      { id: "n_b", label: "Right node", col: 2, row: 2, dx: 240 },  // 同一 cell 第二个节点
    ],
    edges: [
      { id: "e1", from: "n_kickoff", to: "n_init" },     // ← 唯一合法形式
      // 没有 sideRoute / inferred / status 字段 — 都已砍掉
    ]
  }
};
```

**Edge 的 from / to 必须真实解析到现有 node.id**。任何 source 缺失 / target 缺失的边**直接不录入**（见 §5.2）。

### §4.1 可选 `dx`（cell 内水平偏移）

**默认**：节点在其 `(col, row)` cell 内**水平居中**（`left = colX[col] + (colW - w)/2`）。绝大多数节点不写 `dx`。

**何时加 `dx`**：`dx` 是"相对 cell 左边缘的 px 偏移"（`left = colX[col] + dx`）。两种情况：

1. **一个 swimlane cell 里放两个并排节点**（DRAWIO 里某列很宽、同一 `(col,row)` 有两个 mxCell）。给两个节点各写一个 `dx`，直接照抄 DRAWIO 里两个 mxCell 的 `x`（cell 内 x），例：`{…, dx: 20}` + `{…, dx: 240}`。
2. **让同列纵向边保持笔直**：当同列上下节点在 DRAWIO 里都是 `x=20`（非居中），写 `dx: 20` 让它们对齐，纵向边 dx=0 不歪。

**规则**：
- `dx` 从 DRAWIO 该 mxCell 的 `<mxGeometry x=…>` 直接取（那是 cell 内坐标，不是全局坐标）。
- **不要**用 `dx` 去做启发式布局微调（和 §5.1「绝不臆造」同精神）——只在 DRAWIO 明确非居中 / 一 cell 多节点时用。
- `renderer.js` 的 `positionNode()` 与 `_verify.js` 的 `pos()` **必须同步**这条逻辑（`node.dx != null ? colX+dx : 居中`），否则终端几何输出和网页不一致。
- 节点尺寸仍固定 160×60 / 30×30（§9），`dx` 只挪位置不改尺寸。

---

## §5. 五条不可妥协的规则

### §5.1 **绝不臆造连线**

> DRAWIO XML 里没有 `<mxCell edge="1" source=… target=…>` 配对的边，prototype 里就不画。包括：
> - 不准用"上下两行同列"等启发式推断 source / target
> - 不准给边加 `inferred: true` 标志
> - 不准假定"用户没画但应该连"的边

**违反后果**：破坏 1:1 信任，对照 DRAWIO 截图立刻露馅。

### §5.2 **绝不渲染孤儿边**

> DRAWIO 里 source 与 target 都缺的边（导出遗留或工作流失误），直接**丢弃**，不渲染 dashed pin 占位、不放在 `#orphan-pins` 里。也不要在 UI 任何角落显示"还有 N 条未连接"。

**违反后果**：画布显示无意义的小圆点，干扰视觉。

### §5.3 **路由只用 5-case L 形**

`renderer.js` 里的 `routeEdge(s, t)` 只产生以下 5 种路径，不准出现 U 形 / 多 waypoint / 自动越障：

| Case | dx | dy | Path |
|---|---|---|---|
| 同列向上 | ≈0 | <0 | `M s.cx s.top V t.by` (last seg ↑, arrow ↑) |
| 同列向下 | ≈0 | >0 | `M s.cx s.by V t.top` (last seg ↓, arrow ↓) |
| 同行向左 | <0 | ≈0 | `M s.left s.cy H t.rx` (last seg ←, arrow ←) |
| 同行向右 | >0 | ≈0 | `M s.rx s.cy H t.left` (last seg →, arrow →) |
| 对角向下 | ≠0 | >0 | `M s.出口 s.cy H t.cx V t.top` (last seg ↓, arrow ↓, lands on **top edge midpoint** `(t.cx, t.top)`) |
| 对角向上 | ≠0 | <0 | `M s.出口 s.cy H t.cx V t.by`  (last seg ↑, arrow ↑, lands on **bottom edge midpoint** `(t.cx, t.by)`) |
| 兜底 | — | — | `M s.cx s.cy L t.cx t.cy` |

**违反后果**：要么越界，要么箭头方向错（见 §5.5）。

#### §5.3.1 端点必须落在边沿中点，不是角落

每条路径**末端落点**必须贴在目标节点某条边沿的**几何中点**，禁止落在 bbox 角落。规则汇总：

| 入口边 | 中点坐标 | 何时触发 |
|---|---|---|
| target 上边沿 | `(t.cx, t.top)` | 对角向下（dx≠0, dy>0）：箭头进入节点**顶部正中** |
| target 下边沿 | `(t.cx, t.by)` | 对角向上（dx≠0, dy<0）：箭头进入节点**底部正中** |
| target 左边沿 | `(t.left, t.cy)` | 同行向右（dx>0, dy≈0） |
| target 右边沿 | `(t.rx, t.cy)` | 同行向左（dx<0, dy≈0） |

**为什么**：早期版本对角线 case 写成 `H t.left V t.top`（正向对角）或 `H t.rx V t.top`（反向对角），落点是 `(t.left, t.top)` / `(t.rx, t.top)` —— 矩形**左上/右上角**。30×30 ellipse 节点更糟：bbox 角落在圆外 5.7px 处（圆半径 15），视觉上箭头悬空。

**判断口径**：写 `H ${...}` 或 `V ${...}` 时，先问"这段去到 target 的哪条边沿"；该边沿的中点 = (cx / cy, 该边沿坐标)。不是 (left/rx, top/by)。

**椭圆特殊性**：对 ellipse（30×30，`border-radius:50%`），`t.cx + ±15` 才是圆周。`(t.cx, t.top)` 正好是圆顶 —— 同样适用；`(t.cx, t.by)` 是圆底。其它坐标（`(t.left, top)` 等 bbox 角）都在圆外。

### §5.4 **路径永不越界画布**

> 节点 fixed 160×60 / 30×30；横向段落在 `[0, totalW]` 内；纵向段落在 `[0, totalH]` 内。simple L 形天然满足。

**违反后果**：SVG 内 path 部分被剪切，视觉上看到路径"飞出画布"。

### §5.5 **最后一段方向 = 箭头方向**

> SVG `marker-end="url(#ah)"` 用 `orient="auto-start-reverse"`，箭头方向 = 路径最后一段的切线方向。若最后一段是 `V t.top` 朝下走，箭头朝下指向目标顶边，进入节点内部。若最后一段是 `V t.by` 朝上走，箭头朝上指出节点（错）。

**违反后果**：箭头"贴反"或被节点矩形覆盖看不见。

---

## §6. 常见任务

### §6.1 加入一张新 DRAWIO 图（新的 `<diagram>` 块）

1. 在 `Input/DRAWIO/<file>.drawio` 加一个 `<diagram id="X" name="Y">…</diagram>` 块
2. 在 `prototype/diagrams.js` 加一个 `DIAGRAMS["X"] = {…}` entry：
   - `key` / `title` 从 `name`
   - `columns` 从 `table_row_0` 的 `table_cell_0_n` `value` 字段，按 x 顺序
   - `colWidths[]` 从同位置 cell 的 `width` 累加
   - `headerHeight` 从 `table_row_0` 的 `height`
   - `rowHeights[]` 从 `table_row_N` (N≥1) 的 `height`
   - `nodes[]`：找 style 含 `rounded=1;…fillColor=#609EEB` 的 mxCell → `{id, label, col, row}`。end ellipse（style 含 `ellipse;…fillColor=#609EEB`）→ `{id, label:"", kind:"ellipse"}`。**同一 cell 有两个 mxCell，或节点在 DRAWIO 里非居中 → 加 `dx`（§4.1）**。
   - `drillTo`：被 `<UserObject link="data:page/id,XXX">` 包裹的节点 → `drillTo: "XXX"`
   - `edges[]`：**只录** `<mxCell edge="1" source=… target=…>` —— **且 source/target 都非空**。**缺失任意一端 → 丢弃**（§5.1, §5.2）。
3. 跑 `node prototype/_verify.js`：每张图边数 ≥ 1（除非 DRAWIO 里就没画边）；DRILL-DOWN COHERENCE ✓。

### §6.2 修改已有 DRAWIO 图

1. DRAWIO 重新导出，**保持原 `<mxCell id="…">` 字符串稳定**（id 在 `diagrams.js` 里硬编码）
2. 对比新旧 XML：找出 node.id 增减 / col,row 变化 / edge 增减
3. 编辑 `prototype/diagrams.js` 对应 DIAGRAM entry 的 `nodes` 和 `edges`
4. 跑 `node prototype/_verify.js`
5. 在浏览器里打开 `prototype/index.html`，对照 `Input/PIC/<diagram> prototype.png` 视觉确认

### §6.3 调整视觉 token（颜色 / 字体 / 间距）

只动 `index.html` 的 `<style>` 块：

- **颜色** → `:root { --xxx: #... }`
- **节点形状** → `.activity` / `.diamond` 选择器
- **箭头** → `<marker id="ah">` 块（在 `renderer.js` 的 SVG `<defs>`）

**不要改** `diagrams.js` 或 `renderer.js`。

---

## §7. 变更工作流

每次修改 `prototype/`：

1. **备份**：主代理先跑 `cp -r prototype prototype.bak-$(date +%Y%m%d-%H%M%S)/`。**不许跳过**。
2. **派子代理**：
   - 数据 / 渲染可**并行**
   - CSS / DOM 必须在数据 + 渲染稳定后再动
3. **跑 `node prototype/_verify.js`** —— 失败就不继续
4. **视觉校验**：浏览器打开 `prototype/index.html`，对照 `Input/PIC/<diagram> prototype.png` 与 `<diagram> drawio.png`

---

## §8. 验证

### §8.1 终端

`node prototype/_verify.js` 必须输出：

- 全部图节点位置（如 "n_init  pos=(230,180)"）
- 每条边 dx/dy
- `DRILL-DOWN COHERENCE CHECK: ✓`

### §8.2 视觉

打开 `Input/PIC/<diagram> drawio.png` 与 `<diagram> prototype.png`：

| 检查 | 通过标准 |
|---|---|
| 节点位置 | 在同一 cell 内 |
| 连线方向 | 箭头朝目标盒子**内部**进 |
| 连线起止点 | 不超出画布；每条对角 case 末端落在目标边沿**中点**（§5.3.1），不是 bbox 角落 |
| 节点颜色 | 蓝渐变 `#609eeb → #4690eb` |
| 表头 | 浅蓝灰渐变 |
| 字体 | Source Sans Pro（兜底 sans-serif） |

---

## §9. 反模式（绝对不要这么做）

| ❌ 错误写法 | ✅ 替代方案 |
|---|---|
| `{ id, from, to, sideRoute: true }` | 直接给 from/to，让 §5.3 路由自然出 L 形 |
| `shouldUseSideRoute(src, tgt, positions)` 这类自动检测 | 不要做自动检测；数据驱动的简单 L 足够 |
| `{ id, from, to, inferred: true }` | 直接丢弃这条边（DRAWIO 里没有） |
| `{ id, from: null, to: null, status: "orphan", originRow: N }` | 直接丢弃这条边 |
| `if (e.from == null) drawDashedPin(...)` | 不要渲染 |
| 写 `edge.target` (legacy typo) | 改成 `edge.to`（已删 legacy guard） |
| `<script type="module">` | 用普通 `<script>` |
| 在 `_verify.js` 里加 null-from/to 的 guard | 不需要 —— 数据已无 orphan / inferred |
| 把节点 wxh 改成 200×80 之类 | 保持 160×60 / 30×30 —— 数据 + 路由都假设这两个尺寸；要挪位置用 `dx`（§4.1），不改尺寸 |
| 对角 case 写成 `H t.left V t.top` / `H t.rx V t.top` 落点在 bbox 角 | 必须 `H t.cx V t.top` / `H t.cx V t.by`，落点在边沿中点（§5.3.1） |

---

## §10. 项目考古学

读到这里的人会问"为什么不……"。以下是已被否决的方案与原因：

### ~~inferred 边~~ → 删

第一轮实施根据"上下两行同列"推出 5 条 inferred 边（如 Plan Project → Execute Project Delivery）。**用户截图对比 DRAWIO 后否决**：Plan→Execute 这条边在 DRAWIO 里根本没有画。结论：**别让 renderer 替数据说话**。

### ~~orphan-pin 占位 + dashed circle~~ → 删

第一轮为了"忠实反映 19 条边"，给 source/target 都缺的 6 条边画了 dashed 小圆。**用户否决**："只保留 XML 明出边的 8 条"—— 把 11 条都没了，孤儿边不需要渲染。

### ~~sideRoute U 形 + shouldUseSideRoute 自动检测~~ → 删

第一轮为了 sc_e1 "穿过 PTC Integrity 节点不好看"加了：(a) `sideRoute: true` 强制 U 形；(b) `shouldUseSideRoute()` 检测中间列有节点时改 U；(c) waypoints 缓存。**全部砍**，理由：
- U 形会越界 (`rightX = t.cx + tw + 40` 直接溢出画布，§5.4)
- 自动检测有过多 false positive（同行有邻居也会触发）
- 用户："别管过于严格，只要业务可看"

最终 4 轮砍到 5-case 纯函数 (§5.3)，没有 sideRoute / U 形 / waypoint 任何遗留。

### ~~routeEdge 4 端口出口模型~~ → 简化

中间一版写过"top/bottom/left/right 4 端口"，但**同一 case 不同方向**有歧义（dx=0 dy>0 是 down-出口 vs 同列 + dy<0 是 up-出口）。**简化为 5 case**，每个 case 直接写死路径字符串，更易验证。

### ~~e.target (DRAWIO 字段名)~~ → 全删

DRAWIO 里 edge 是 `source=` / `target=` 两个属性。我们 prototype 数据用 `from` / `to`。中间出过一次 typo bug：renderer 读 `positions[e.target]` 取不到东西。**修法是 renderer 改用 `e.to`、不再读 `e.target`**。

### 一 cell 两节点 → 选 `dx` 偏移（不拆列 / 不丢节点）

DRAWIO 第二轮把 Initiate Project 的 SWPM 列拓宽到 430px，同一 `(col,row)` cell 里放了两个并排 mxCell（SW Configuration Setup + SW ALM_Team Setup）；且该列单节点在 DRAWIO 里是左对齐（`x=20`）而非居中，好让纵向边笔直。原 renderer 一 cell 只居中一个节点，表达不了。

评估过 3 个方案，**选 (A)**：

- **(A) 加可选 `dx` 偏移**（§4.1）✅ —— 给节点加 `dx`（cell 内 x，照抄 DRAWIO），有则 `left=colX+dx`，无则居中。数据驱动、改动最小（`positionNode()` + `_verify.js` 各一行），旧节点全不受影响。
- **(B) 只居中、丢掉第二个节点** ❌ —— 少画一个真实节点，违背 1:1 忠实。
- **(C) 把 430px 宽列拆成两个逻辑子列 + 表头 colspan** ❌ —— 改动大（表头合并、列索引重映射），且污染其它图的列逻辑。

结论：`dx` 是**照抄 DRAWIO 坐标**的忠实偏移，不是启发式布局——只在 DRAWIO 明确非居中 / 一 cell 多节点时用（同 §5.1 精神）。

### 不写 DRAWIO parser

考虑过：用 DOMParser / mxgraph 把 drawio.xml 直接解析成 `DIAGRAMS`。**否决**：每个 diagram 有 ~30 行语义活动 + 边，4 张图约 120 行 JS。写通用 parser 工作量远超此，且 DRAWIO 里有些边 source/target 缺失、得照旧人工判断。**手工转录**质量更高、调试更直接。

### file:// 兼容性

`<script type="module">` 在 `file://` 协议下加载不到（CORS）。用普通 `<script>` 是**唯一的**方案。除非改用 build step（vite 等），但那就违背了"零依赖双击可开"的需求。

### ~~对角 case 落点为 bbox 角落~~ → 改为边沿中点

第五轮（2026-07）用户截图 `Input/PIC/Snipaste_2026-07-19_13-07-53.png`：`swko_e1`（SW Technical Solution → SW Engineering Kick-Off Presentation）的箭头落在矩形**左上角**；`swko_e3`（SW Engineering Kick-Off Meeting → 末端 ellipse）的箭头落在 bbox **右上角** —— 对 30×30 圆节点而言即"圆外 5.7px 的虚空中"。

原写法 `H t.left V t.top`（正向对角）/ `H t.rx V t.top`（反向对角）最后一笔落在角坐标。**修法**：把 H 段终点从 `t.left` / `t.rx` 改成 `t.cx`，落点变为上/下边沿中点 `(t.cx, t.top)` / `(t.cx, t.by)`。

否决过的替代方案：
- **每边 mid-side 入端口模型（top/bottom/left/right 4 端口 + 角度判定）** ❌ —— 已从 §10 上文否决，和这条同精神：纯几何坐标比端口抽象更直白。
- **保持 bbox 角、靠加大箭头"撞"到节点边** ❌ —— 视觉骗术；任何 zoom 下都能看出箭头浮在角外。
- **只修 dy>0 两条、修完 dy<0 再说** ❌ —— 已知 bug 留着 = 下次接手必然踩坑，§5 全部 case 必须内洽。

---

## §11. Node-detail drawer（追加说明）

右滑抽屉，展示选中节点的 DRAWIO 属性。**纯叠加**：不影响 §5 的边/路由。

### 数据形态

每个 `nodes[]` entry 可选带 `attrs: {…}`，对象字面量插入顺序即渲染顺序。值必须是字符串。

```js
{ id: "sc_ptc", label: "PTC Integrity Project Creation", col: 1, row: 1,
  attrs: {
    Responsible: "EPM",
    Support: "SWPM",
    External_Wiki_Link: "https://...end\nonenote:https://...end",
    Description: "Raise ticket to request ALM project creation"
  }
}
```

### 关键行为

- **触发**：点击任意 `.activity`（不只是 `.drillable`）打开抽屉。`drillTo` 从节点上的点击迁到了抽屉头部的 `Open sub-process →` 按钮；点击节点本身只开抽屉。
- **关闭**：X 按钮 / 点击抽屉外（canvas / breadcrumb / left rail / header 都算"外"）/ Esc。**点击节点不算"外"** —— 同节点是 no-op（Q14），不同节点替换内容（re-select polish 用 90ms opacity）。
- **跨图切换关闭**：左栏、breadcrumb、drill 按钮触发 `Renderer.render`，进入 `render` 第一行就 `closeDrawer()`。这是唯一的「关闭」岔口。
- **选中视觉**：`.activity.selected` 加 `outline: 2px solid var(--brand-end)` + 1px 白内描边 + 6px `--brand-glow` 软发光（同心环）。**不缩放**，避免和 `.drillable:hover` 的 `translateY(-1px)` 冲突。
- **链接渲染**：
  - 普通链接字段（如 `External_Wiki_Link`）按 `\n` 拆分成 N 个独立可点击项，每个 `target="_blank" rel="noopener noreferrer" class="drawer-link"`。
  - 描述性字段（`Description` 等）走 `autolink`：正则 `/\bhttps?:\/\/\S+|\bonenote:\S+/g` 把 URL 包成 `<a target="_blank">`，`\n` 改 `<br>`。
  - 抽屉内点链接 → `_blank` 新标签页，抽屉**保持打开**。
- **空状态**：节点没有 `attrs` 时不显示假字段 —— 显示一段引导性提示："No attributes" + 一行 hint，告诉数据作者用 `<object>` 包裹 `mxCell` 来注入属性。
- **抽屉头 eyebrow**：`${diagramKeyTail} · ${nodeIdTail}`（如 `2N7 · PTC`），单一签名，借自工程图索引的视觉惯例。

### Token 追加

只新增 3 个派生 token：

```css
--shadow-drawer: -6px 0 24px rgba(20,40,80,0.08);
--brand-glow: rgba(70,144,235,0.18);
--field-index-color: #c1cad6;
```

旧 token（`--surface` 等）继续吃，没有新色板。

### 新文件

- `prototype/_verify_drawer.js` —— Node 端 smoke-test，`require()` 渲染器，对 PTC 节点调用真实 `buildDrawerBody` 并断言（4 字段、2 个 SharePoint/OneNote 锚、Description 不自动链接）。

### `<1024px` 视口

`.app{min-width:1024px} + margin-right:320px` 在 ~1024px 视口下会溢出。静态原型可接受；如要响应式需另开评估。

### 反模式

- ❌ 不要从 `Description` 里硬编码拆 `External_Wiki_Link` —— 它们是两个字段。
- ❌ 不要把 `outline-offset` 改成负值 —— 与背景层叠加产生半透明环。
- ❌ 不要在抽屉 header 上加大字体 hero（"Inspect a node" 之类）—— 标题就是节点 label。
- ❌ 不要把 drill 按钮挪回节点 click —— 抽屉第一、drill 在抽屉头（Q5）。
- ❌ 不要让 `closeDrawer()` 被 `Renderer.render` 之外的其他代码直接手动调用 —— 统一走 `Renderer.render` 这一条岔口（避免双 toggle）。
