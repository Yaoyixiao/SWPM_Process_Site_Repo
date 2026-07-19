# Design Analysis — "Change Request Management" Page

> Source: `Input/Web/Change Request Management - STE Standard process.html` （saved from `https://cdc-stages.emea.zf-world.com:8443/stages/#/workspace/965/_vv/process/activity/_--x4sOd0e7u7U_qeu5izBA`）
>
> 在浏览器里 "Save Page As → Complete HTML" 后离线解析的页面 — 抓到了 **全部设计信息**（CSS 变量、SVG 流程图、描述中的富文本/表格、卡片结构、右侧栏模式）。

---

## 1. 是哪个系统？

| 维度 | 值 |
|---|---|
| 应用名 | **stages** （Angular 19，`ng-version="19.2.10"`） |
| 平台性质 | 类 Signavio 的流程/BPM 设计器 + 文档管理 |
| 当前工作区 | Workspace 965 = `STE Standard process` (Processes) |
| 当前条目 | 流程 **Change Request Management** （Workflow），Release 50.0，已 `valid-circle` 校验通过 |
| 操作模式 | 右上 Right-Rail 默认 **`Viewing`**（还有 `Modelling` / `Compliance`） |
| 用户 | Yao Yixiao / SGH CDAW14（superuser 头像） |
| 入口路径 | `Process › Workflows and Activities › Change Request Management`（面包屑） |
| 文档 ID | `/_--x4sOd0e7u7U_qeu5izBA` |

辅助文件 `custom.css` 给文件状态上色（`In_Progress` / `In_Review` / `Not_In_Use` / `Approved` / `Done`），佐证这是个"流程发布 & 状态管理"产品。

---

## 2. 页面骨架（layout）

固定三栏，整体 `position:fixed` + 4s ease 过渡 — 抽屉式：

```
┌────────────────────────────────────────────────────────────────────────────┐
│ #mobile-header (≤1280px 才显示)  [hamburger] [search] [context-menu]        │
├──────────┬─────────────────────────────────────────────────┬───────────────┤
│          │ #search.expand  (bg: white, 全宽搜索框)         │               │
│ Nav      ├─────────────────────────────────────────────────┤ Sidesheet     │
│ Drawer   │ #content.has-toolbar                            │ (hidden)      │
│ 340 px   │  ┌─ Page-Header ──────────────────────────┐     │ 540 px        │
│          │  │ breadcrumb · process-version chip     │     │ transform:    │
│ logo +   │  │ <h1> Change Request Management </h1>   │     │ translateX    │
│ workspace├──────────────────────────────────────────────┤ (100%)         │
│ selector │  ┌ stages-tab-card (Flow / Table / Grid)  ─┐   │               │
│          │  │  [tabs … ] [zoom 100%] [⌃] [⋮]         │   │               │
│          │  │  ┌────────── SVG BPMN diagram ─────────┐│   │               │
│ Home /   │  │  │ swimlanes × activities × arrows    ││   │               │
│ Up / ⋮   │  │  └───────────────────────────────────┘│   │               │
│          │  └────────────────────────────────────────┘   │               │
│ folder   │  ┌──── col-8 ────────┐ ┌──── col-4 ────────┐  │               │
│ list     │  │ Description       │ │ Work Products     │  │               │
│ (5 items)│  │ Responsible       │ │ Shows how to …    │  │               │
│          │  │ Phases            │ │ Guidance          │  │               │
│          │  │ History           │ │   └ Practices (2) │  │               │
│ avatar   │  └───────────────────┘ └───────────────────┘  │               │
│ Help     ├─────────────────────────────────────────────────┤               │
│ Logout   │ page-footer                                    │               │
│          │                                       [Right-Rail]            │
│          │                                       ├ Viewing (active)         │
│          │                                       ├ Modelling                │
│          │                                       └ Compliance               │
└──────────┴──────────────────────────────────────────────────────────────────┘
                                                              ↑ 72px ChatBot/72px Sudo-flag 浮动于右上
```

**布局 CSS（关键）**

```css
:root {
  --padding-top: 30px;   --padding-right: 20px;
  --padding-bottom: 30px;--padding-left: 30px;
  --gutter: 30px;        --gutter-half: 15px;
}
@media (max-width: 1280px) {
  :root { --padding-top:30px; --padding-right:20px;
          --padding-bottom:30px; --padding-left:20px;
          --gutter:15px; --gutter-half:7.5px; }
}

.stages-main-content {
  position: absolute; height: 100%; left: 340px; right: 0;
  transition: left .4s cubic-bezier(.4,0,.2,1) .1s,
              right .4s cubic-bezier(.4,0,.2,1) .1s;
}
.stages-main-content.expand { left: 0; }

.stages-sidesheet {
  position: fixed; right: 0; width: 540px; bottom: 0; top: 0;
  background: #fff; z-index: 8;
  box-shadow: 5px 0 13px #00000080;
  transform: translate(100%);
  transition: transform .4s cubic-bezier(.4,0,.2,1) .1s;
}
.sidesheet-open .stages-main-content { right: 540px; }
```

---

## 3. 设计令牌（Design Tokens）

### 3.1 颜色（提炼自 CSS + inline SVG）

| Role | Hex | 用途 |
|---|---|---|
| `--bg` | `#f1f4f8` | 页面背景（蓝灰） |
| `--surface` | `#ffffff` | 卡片、抽屉、搜索栏 |
| `--text` | `#2a333e` | 正文 |
| `--text-muted` | `#819bb0` | 二级文本、图标默认、未选中 tab、SVG 文字/连接线 |
| `--border` | `#e4e7ec` | 卡片描边、placeholder 矩形 |
| `--border-soft` | `#e1e6ec` | disabled / 浅分割 |
| `--brand-orange` | `#f37100` | sudo-flag 三角、superuser 徽章 |
| `--accent-blue` | `#51acd3` | zoom / diagram hover |
| `--hover-blue` | `#557791` | 鼠标悬停文字 |
| `--error` | `#f36969` | 错误列表项 |
| `--shadow-card` | `#00000029 0 1px 4px` | 卡片浮起 |
| **Activity 渐变** | `rgb(96,158,235) → rgb(70,144,235)` | BPMN 活动块（**主品牌蓝**） |
| State `.In_Progress / .In_Review` | `#FFD9AB` | 文件进度中/审核中（桃色） |
| State `.Not_In_Use` | `#E57579` | 未使用（红） |
| State `.Approved` | `#58DBA0` | 已批准（亮绿） |
| State `.Done` | `#187A6D` | 已完成（深青） |

> 解读：整套 `stages` 在浅蓝灰画布 + 白卡片上**用深蓝渐变撑视觉**，
> 辅以橙色做"superuser/admin"信号，状态色做表格 + 清单行级强调。

### 3.2 字体

```css
* { font-family: 'Source Sans Pro', sans-serif, Arial; }
字体: Source Sans Pro (400 常规 / 500 semibold + 斜体)
基号: 12px / 行高继承；导航/角色名 14px；h1 视内容
回退: Arial
加载方式: woff2 by unicode-range + local() + ttf
```

### 3.3 形状 / 间距

```
border-radius: 4px  (card, button, search, input)
gutter: 30 / 15
抽屉动画: .4s cubic-bezier(.4,0,.2,1) .1s
列表虚线 placeholder: 1px dotted #E4E7EC
阴影:
  - card: 5px 0 13px #00000080  （sidesheet）
  - drag preview: 0 5px 5px -3px #0003, 0 8px 10px 1px #00000024, 0 3px 14px 2px #0000001f
滚动条: 通用 thin；night/active scrollbar face #c6c6c6
```

### 3.4 图标系统

- 自家 icon font：`ico` 类名（`ico-home` / `ico-search` / `ico-workspace` / `ico-viewing` / `ico-modelling` / `ico-compliance` / `ico-chevron-up` / `ico-chevron-down` / `ico-fit-to-page` / `ico-plus` / `ico-minus` / `ico-more-vertical` / `ico-valid-circle` / `ico-help` / `ico-power-off` / `ico-arrow-up` …）
- "Delightful" hamburger：3 条 span + `.first/.second/.third`
- 元素类型图标：`ico-et-guidance ico-et-practice` / `ico-et-metric` / `ico-et-file`

### 3.5 BPMN 节点视觉（从 inline SVG 反推）

```
Activity:  rect w=160 h=60 rx=4 ry=4
           fill: linearGradient rgb(96,158,235)→rgb(70,144,235)
           投影：内嵌 base64 PNG (181×81) 模拟立体阴影
           文本：白色 Source Sans Pro

Decision (diamond):  M <mid-x> <top-y> L <right-x> <mid-y> L <mid-x> <bot-y> L <left-x> <mid-y> Z
           coords 实测：  M556.5 270 L585 241.5 L613.5 270 L585 298.5 Z
           fill: 同样的 linearGradient
           size:  width ≈ 57, height ≈ 57
           文本： Source Sans Pro, color rgb(129,155,176)

Sequence flow:  stroke rgb(129,155,176)  stroke-width: 2
                arrowhead: d="M x y L (x+5.625) (y-13.5) L x (y-9.125) L (x-5.625) (y-13.5) Z"
                label 标签白底矩形 = (宽21, 高19)  + Yes/No 文字

Swimlane:  fill rgb(228,231,236) 内框, header 用 rgb(241,244,248) 描边
          横向 swimlane 文字：Source Sans Pro 14px rgb(129,155,176)

画布: 695 × 650 viewBox "0 0 695 650"
网格背景: white
```

完整 SVG 是从后端拉到的（`ySVG 2.6`），前端按 viewBox 直接 inline `<svg>` 渲染 — 这是个"懒加载 BPMN 转 SVG" 的成熟方案。

---

## 4. 组件 / 模式清单

### 4.1 顶部 page-header
```
┌─ breadcrumb-line ─────────────────────────────────────────────────┐
│ Process › Workflows and Activities  ·  [process-version chip]     │
│ Release 50.0  ✓                  (valid-circle)                    │
├───────────────────────────────────────────────────────────────────┤
│ <h1> Change Request Management </h1>                              │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 `<stages-tab-card-no-route-dynamic>` — Tabs + Toolbar + Diagram

```html
<stages-tab-card-no-route-dynamic>
  <stages-card>
    <header>
      <stages-tabs>
        <stages-tab-no-route>Flow</stages-tab-no-route>
        <stages-tab-no-route class="...active">Table</stages-tab-no-route>   ← active
        <stages-tab-no-route>Grid</stages-tab-no-route>
      </stages-tabs>
      <stages-toolbar></stages-toolbar>
      <stages-zoom-toolbar>
        <button ico-fit-to-page>  <button ico-minus>
        <span>100%</span>         <button ico-plus>
      </stages-zoom-toolbar>
      <expand-collapse>⌃</expand-collapse>
      <stages-menu opento="bottom">⋮</stages-menu>
    </header>
    <stages-tab-content-dynamic>
      <stages-process-diagram>
        <stages-image-zoom>
          <stages-drag-scroll>
            <div class="drag-scroll-content">
              <div stagesdragscrollitem>
                <svg viewBox="0 0 695 650"> ... BPMN ... </svg>
              </div>
            </div>
          </stages-drag-scroll>
        </stages-image-zoom>
      </stages-process-diagram>
    </stages-tab-content-dynamic>
  </stages-card>
</stages-tab-card-no-route-dynamic>
```

> **重要**：`<svg>` 整图作为 `<a href="...activity/...">` 的子节点 — **整张图就是导航**。点哪个节点跳到那一步。

### 4.3 8:4 列：左侧 `col-8` = 主文档；右侧 `col-4` = 元数据

| col-8 (cards 展开) | col-4 (cards 折叠 + 折叠/`counter`) |
|---|---|
| **Description**（富文本 + 表格）  | **Work Products**  (empty)        |
| **Responsible** (empty)           | **Shows how to perform** (empty)   |
| **Phases** (empty)                | **Guidance** → grouped list        |
| **History** (empty activity-stream) | · Practices (2)                  |
|                                     | · Metrics (1)                    |
|                                     | · Files (3)                      |

**`<stages-card>`** 通用形态：

```html
<stages-card-dynamic>
  <stages-card style="min-height:72px">
    <header class="ng-star-inserted">
      <div class="wrapper">
        <h5>{{title}}</h5>
        <stages-toolbar>...</stages-toolbar>
        <stages-button-expand-collapse> <i ico-chevron-up/down> </stages-button-expand-collapse>
        <stages-menu opento="bottom">⋮</stages-menu>
      </div>
    </header>
    <div class="panel">
      <!-- body: description | association-list | activity-stream -->
    </div>
  </stages-card>
</stages-card-dynamic>
```

### 4.4 `<stages-association-list>` — 分组分项 + 计数 + 拖拽
```html
<ul class="grouped-list">
  <li class="group">
    <header class="group-header">
      <h3>Practices</h3>  <span class="counter">2</span>
      <expand-collapse>⌃</expand-collapse>
      <stages-menu>⋮</stages-menu>
    </header>
    <ul class="list dense" cdkdroplist [cdkDropListDisabled]>
      <li cdkdrag class="list-item">
        <a class="label">
          <i ico-et-guidance ico-et-practice>
          <div class="text">
            <h4>Change Management</h4>
            <p>{{snippet}}</p>
          </div>
        </a>
      </li>
      ...
    </ul>
  </li>
  ...
</ul>
```
> Angular CDK drag&drop；列表"拖动+空态提示+组折叠+分组计数" — 这套是非常成熟的企业后台模式，复用价值高。

### 4.5 右侧 Right-Rail
```html
<stages-right-navigation-rail>
  <div id="right-navigation">
    <nav>
      <ul class="toolbar">
        <li> <stages-menu>⋮</stages-menu> </li>
        <li class="active"> <a ico-viewing>   Viewing   </a> </li>
        <li>           <a ico-modelling>  Modelling  </a> </li>
        <li>           <a ico-compliance>  Compliance </a> </li>
      </ul>
    </nav>
  </div>
</stages-right-navigation-rail>
```
> 三种"操作模式"间切换是整套产品的元模式 — 我们未来做"流程图查看+建模+合规" 时一定要保留。

---

## 5. 业务内容（来自富文本 Description）

**Process Purpose**: "ensure that Changes are managed, tracked, and controlled to closure from Initiation through Realization"

**Scope**:
- Steering Engineering Project Management
- Steering Product Requirements Management
- Product Mechanical & Mechatronic Management
- Product Software Management
- Process / BPM documentation

**5 Activities × 5 Roles** —— 实际上 4 个用 CCB（在决策点），而活动分摊到 3 个 swimlane：

| # | Activity | Swimlane / Role | Type |
|---|---|---|---|
| 1 | Identify Change | Anyone | Activity |
| 2 | Analyse Change | Change Owner | Activity |
| 3 | Approve Change? | CCB: Change Control Board | **Decision** (yes/no) |
| 4 | Implement Change | Change Owner | Activity |
| 5 | Close Change | Anyone | Activity |

**State Machine (PTC Integrity ↔ Windchill)** — 内嵌表：

| Activity | Status | PTC Integrity | Windchill |
|---|---|---|---|
| 1 | Draft Change | ALM_Initiated | Open |
| 1 | CR Identified | ALM_Defined / ALM_Checked | Under Review |
| 2 | CR Analyzed | ALM_Analysed | Under Review |
| 3 | CR Approved | ALM_Approved | Approved |
| 4 | CR Implementation | ALM_Planned / ALM_Started | Approved |
| 4 | CR Implemented & Tested | ALM_Realized | Resolved |
| – | CR Deferred | ALM_Deferred | N/A |
| 5 | CR Closed | ALM_Closed | Closed |
| 5 | CR Rejected/Cancelled | ALM_Rejected / ALM_Cancelled | Cancelled |

**Tailoring**: EPM 可委派 "Change Coordinator" 处理 CR 管理与关闭。

**Process Assets**:
- C_065_3_SSE_050_EN — Work Instruction: *CR Workflow Role "Change Owner"*
- C_065_3_SSE_051_EN — Training Material: *CR Management Overview* (MKS/PTC link)

**Guidance** (聚合自右侧卡片):
- Practices (2): *Change Management* / *Change Management in PTC Integrity Work Instructions*
- Metrics (1): *Cycle Time for the Change Process*
- Files (3): *C_065_2_SSE_EN CR Management* / *Process Owner: Jason Hall* / *C2.04.04 Manage Product Change*

---

## 6. 复用建议（写给未来的我们）

如果我们要复刻这种"流程详情页" — 推荐拆出以下组件库：

```
/design-tokens/
  ├── colors.json     （含 State 5 色 + 主蓝渐变 token）
  ├── spacing.json    （gutter 30/15, padding 30/20）
  ├── motion.json     （.4s cubic-bezier(.4,0,.2,1) .1s）
  └── typography.json （Source Sans Pro）

/components/
  ├── PageHeader (breadcrumb + version chip + h1)
  ├── NavRail    (左 340 drawer：workspace selector + 列表 + avatar/help/logout)
  ├── ModeRail   (右 72 fixed：Viewing/Modelling/Compliance 三态)
  ├── TabCard    (含 tabs + zoom toolbar + expand-collapse + overflow menu)
  ├── DiagramCanvas (CDK 拖拽 + zoom + fit-to-page + 内嵌 inline SVG)
  ├── Card       (header.title + toolbar + body + collapse 动画)
  ├── GroupedList (group header + counter + cdkDropList + empty state)
  └── Sidesheet  (right slide-in 540px, 4s ease)
```

**适配到我们项目的建议**：
- 我们已经有 `Input/DRAWIO/`（drawio 流程图），可以导出 SVG 用 `<DiagramCanvas>` 渲染，与 BPMN 行为一致。
- 主色 `#609eeb`（drawio 默认蓝）和这里的 `rgb(96,158,235)` 极为接近，可统一为单一品牌蓝。
- 状态色（5 态）可直接复用。
- 把"操作模式 Right-Rail"当成"查看 / 编辑 / 审计" 切换，对内部工具泛用。

---

## 7. 复刻一份 Web Demo（按现有 token 重写）

见同级目录 [design-system-prototype/](design-system-prototype/) （生成中），用 React + 纯 CSS 复刻本页面，便于团队在 [[frontend-design]] / [[design-taste-frontend]] 评审时对照调整。

---

**出处文档**
- HTML: [Change Request Management - STE Standard process.html](Input/Web/Change Request Management - STE Standard process.html)
- Custom: [custom.css](Input/Web/Change%20Request%20Management%20-%20STE%20Standard%20process_files/custom.css)
- Diagram font: [diagramfont.css](Input/Web/Change%20Request%20Management%20-%20STE%20Standard%20process_files/diagramfont.css)

