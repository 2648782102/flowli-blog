# Design Contract — flowli 的个人博客

状态：**最终契约｜方向 C：夜间编辑台 / 藏蓝液态玻璃**。本文是视觉实现的唯一契约；代码以 `src/styles/editorial-paper.css` 为唯一全局样式源。

## 决策

2026-11-11，用户否定浅色「纸面编辑部」成品，要求重新提升视觉完成度。最终实现改为「夜间编辑台」：深藏蓝场域、单一大幅封面、衬线大字、折射高光与克制的液态玻璃表面。方向 A / B 均不再作为备选。

## 固定约束

- 技术栈保持 Astro + Svelte + Tailwind/CSS，不改造成 React/Next.js。
- 内容管理保持 Pages CMS + GitHub Pages；仓库仍是 `2648782102/flowli-blog`，展示名是 `flowli`。
- 藏蓝是全站场域与主色；冰蓝文字、亮蓝强调与少量暖琥珀状态色构成层级。浅色与深色模式都保持藏蓝身份，不回退成白纸。
- 液态玻璃是统一材质系统：导航、文章阅读面、主文章玻璃板、搜索 / 下拉 / 菜单 / 临时浮层都使用受控 `backdrop-filter`、边缘高光与轻阴影；正文文字区不被装饰层覆盖。
- 禁止：照片 banner、紫蓝渐变 Hero、到处毛玻璃、白卡网格、所有区块同款圆角卡片、发光边框、emoji 功能图标、无意义英文 eyebrow、三张同款 feature card、装饰性玻璃覆盖正文。
- 所有设计同时定义 light / dark、mobile / desktop、hover / focus / active、reduced motion。

## 色板

```text
Light field
Paper          #0A1E3D   页面底色
Paper deep     #06152C   页面纵深
Glass          #091B37 / 74%   主阅读面与浮层
Glass hover    #112C52 / 80%   交互态
Ink            #F3F7FF   标题与主文字
Muted ink      #C6D8EC   正文
Faint ink      #96B1CF   日期与元信息
Accent         #8FC2F2   链接、选中态、关键动作
Mist           #A9C7E8   玻璃边缘
Amber          #E8B86D   仅用于状态点

Dark field
Paper          #051022
Paper deep     #030B19
Glass          #07152B / 80%
Ink            #EEF5FC
Muted ink      #ADC3DA
Accent         #8FC2F2
```

## 字体与尺度

```text
Display : Noto Serif SC / Source Han Serif SC / Songti SC / Georgia
Body    : Noto Sans SC / PingFang SC / system-ui
Mono    : JetBrains Mono Variable

Scale   : 72 / 48 / 28 / 18 / 16 / 14 / 12 px（桌面通过 clamp 缩放）
Measure : 正文 68–72ch；摘要约 62ch
Spacing : 4px 基准；组件 8 / 12 / 16 / 24 / 40 / 64；区块 96 / 128
Radius  : 主封面 24px；阅读面与功能浮层 16–20px；按钮 8px；导航胶囊 16px
Border  : 1px hairline，仅用于分组和交互边界
Shadow  : 玻璃面使用受控远投影 + 内侧上下高光；禁止整体抬升式 hover
Motion  : 150–250ms ease-out；响应交互与页面状态；reduced motion 关闭位移/模糊
Focus   : 2px solid 主色 + 3px offset，所有交互元素必须可见
```

## 布局

```text
Desktop 1440
┌──────────────────────────────────────────────────────────────┐
│ [flowli]   主页 归档 作品 关于                  搜索 / 设置   │ ← 稳定玻璃导航
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 把好奇心                                        透镜几何  │  │
│  │ 写下来。                                                  │  │
│  │ 记录技术、工具与日常。                                     │  │
│  │ flowli / 已发布 / 最近更新                 进入文章 GitHub │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 最新一篇：标题、摘要、阅读时长                 真实封面    │  │
│  └────────────────────────────────────────────────────────┘  │
│  写作台 / 最近写下的                              查看全部     │
│  01  标题 / 摘要 / 分类 / 日期                         →       │
│  ──────────────────────────────────────────────────────────  │
│                            低调页脚                            │
└──────────────────────────────────────────────────────────────┘
```

- 首页与所有内页共享同一导航高度和主内容起点，消除 banner 高度差造成的切换抖动。
- 主阅读栏优先占满可用宽度；首页不渲染侧栏。其他页面在 1440px 以下侧栏下移，1440px 以上作为独立外挂信息带。
- 主内容盒统一使用同一阅读宽度，不允许页面各自用模板 `min-h` / 网格列 / 卡片撑出不同几何。
- 去掉首页大幅风景 banner、三栏模板布局、资料卡、目录卡与首页音乐播放器。
- 首页 Hero 是一张完整的夜间玻璃桌面，左对齐衬线大字，最多两个明确动作。
- 首页文章列表使用「单篇主文章玻璃面 + 编号索引 + hairline」，不是等宽卡片网格；只有文章确实指定封面时才显示真实封面。
- 归档、分类、标签页采用文字索引 / 表格行，参考 swyx ideas 与 Jim Nielsen archive。
- 侧栏降低对比度，使用无卡片边框的文字分组；公告只保留低对比文本。
- 正文页：单一白色/深色纸面，清晰标题层级，代码块发丝边框，不放玻璃。

## 交互

- 顶部导航固定高度，选中态用 2px 藏蓝下划线 + 字重；切换只改颜色/字重，不改几何尺寸。
- 文章详情页继承「归档」选中态；桌面导航与移动菜单使用同一套同步逻辑。
- Swup 在 `visit:start` 与 `page:view` 都立即把滚动位置归零，避免归位滚动造成弹跳。
- 搜索、主题、翻译、菜单是临时玻璃浮层；点击开关切换，Esc 关闭，关闭后不留下阴影或透明层。
- 文章行 hover 只改变底色和箭头位置，不整体抬升。
- 所有内容卡片、图片和菜单 hover 只允许颜色、背景、边框、透明度变化；禁止 `translate` / `scale` / 阴影抬升，避免挤压、遮挡或改变几何。
- `prefers-reduced-motion` 关闭非必要动画；`prefers-reduced-transparency` 把玻璃浮层降级为不透明纸面。

## 组件契约

| 组件 | 规则 |
|---|---|
| Navbar | 固定高度、稳定选中态、唯一显著玻璃层 |
| Home hero | 深藏蓝夜间封面，衬线大字，玻璃高光与透镜几何 |
| Featured post | 单篇主文章玻璃面，真实封面 / 单字印记，不改变几何 |
| Desk index | 编号 + 标题 / 摘要 / 分类 / 日期，hairline 分隔 |
| Post page | 68–72ch，藏蓝玻璃阅读面 |
| Sidebar | 仅内页保留文字分组；首页从 DOM 层移除 |
| Archive | 日期 + 标题 + 标签，表格行 |
| Floating panels | 搜索/菜单/主题可玻璃，关闭后无残留 |
| Footer | 低调、链接完整、无赞助/装饰 |

## 评审门槛

- `pnpm check` 与 `pnpm build` 通过。
- `design/check-interactions.mjs` 通过：桌面/移动端 Tab 选中态、导航高度、内容起点、横向滚动、滚动复位。
- `design/capture-screenshots.mjs` 产出首页、移动、文章、归档、关于截图，并写入 `design/review.md`。
- 与 `design/screenshots/current/` 基线和 `design/screenshots/references/` 参考图并排比较。
- 人工批准后才提交或推送。
