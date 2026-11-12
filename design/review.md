# Visual Review Log

## Round 0 — 2026-11-11

目标：建立当前视觉基线与参考标尺，不评审任何新实现。

### 采集结果

- 当前站：`design/screenshots/current/home-desktop.png`、`home-mobile.png`、`post-desktop.png`、`archive-desktop.png`。
- 参考站：`design/screenshots/references/01-maggie-appleton-home.png` 至 `06-jim-nielsen-archive.png`。
- 采集方式：Chrome headless，light scheme，桌面 1440×900，移动 390×844，全页截图。

### 当前基线问题

| 项 | 观察 | 影响 | 后续动作 |
|---|---|---|---|
| 材质 | 导航、Hero、文章卡、侧栏、公告、浮层都接近透明圆角玻璃 | 层级被抹平，阅读面不够稳定 | 玻璃限制到功能浮层 |
| 首页 | 大幅风景 banner + 覆盖式 Hero 玻璃板 | 两次抢焦点，标题被材质包裹 | 改为纯文字 Hero |
| 卡片 | 文章、侧栏、公告共享圆角/阴影/留白 | 像仪表盘，不像博客 | 文章列表改 hairline 行 |
| 内容 | 测试标题、短占位正文、公告、音乐控件同时出现 | 视觉判断被假内容干扰 | 使用真实文章或明确 sample |
| 交互 | 历史反馈有 Tab 选中态与切换抖动 | 降低信任感 | 固定导航高度与主内容起点 |

### 参考标尺结论

- Maggie Appleton：首页大标题与内容分组，证明文字可以成为主视觉。
- Josh W. Comeau：文章索引可读、卡片不透明、背景克制。
- Jim Nielsen：纯文字索引与单色链接，证明少材质也能有明确气质。
- swyx：杂志式分区、全量 ideas 表格，适合归档/索引页。

### Taste checklist 初评

- 10 秒测试：当前基线未通过；读者先看到壁纸与控件，而非稳定的「谁 / 写什么 / 读哪里」。
- 字体层级：标题有大小差异，但被卡片与元数据稀释。
- 色彩：藏蓝方向成立，但蓝色透明层覆盖面积过大。
- 布局：网格整齐但节奏单一，所有模块都是同款圆角容器。
- 通用 AI 信号：命中「玻璃拟态覆盖多处」「统一圆角卡片」「每个模块同宽同阴影」「装饰抢过内容」。

### 人类决策

- 2026-11-11：用户选定方向 A「纸面编辑部」。`DESIGN.md` 已转为最终契约，方向 B 作废。

## Round 1 — 2026-11-11

目标：按方向 A 重构 UI，保持液态玻璃主题但降级为功能层材质，解决历史布局抖动与 Tab 选中态问题。

### 实现摘要

- 删除三套互相覆盖的全局玻璃样式、折射 SVG、banner/fullscreen wallpaper 组件和壁纸切换入口；新增唯一全局样式源 `src/styles/editorial-paper.css`。
- 首页改为纯文字大标题 + hairline 文章索引；默认渐变封面关闭，真实封面只在文章指定时显示。
- 导航改为固定高度浅冰蓝玻璃胶囊，选中态使用藏蓝下划线与字重；正文/侧栏/归档使用不透明纸面。
- 归档改为按年份分组的日期 / 标题 / 标签表格行。
- 桌面/移动页面共享同一内容起点；Swup 在切换开始和页面视图完成时立即复位滚动。
- 关闭首页音乐播放器、大幅照片 banner、首页 TOC 浮块、返回顶部/TOC 悬浮按钮；公告文案改为低对比中文。
- 字体改为 Noto Serif SC 标题 + Noto Sans SC 正文；藏蓝主色保留在文字、链接、选中态和关键动作。

### 截图

- 本地实现：`design/screenshots/local-a/home-desktop.png`、`home-mobile.png`、`post-desktop.png`、`archive-desktop.png`、`about-desktop.png`。
- 基线对比：`design/screenshots/current/home-desktop.png`。
- 参考对比：`design/screenshots/references/01-maggie-appleton-home.png`、`03-jim-nielsen-blog.png`、`05-swyx-ideas.png`、`06-jim-nielsen-archive.png`。

### 视觉评审

- 10 秒测试：通过。首屏直接显示 flowli、写作主题、文章入口，不再先看到壁纸和控件。
- 材质：正文、文章行、侧栏、归档均为稳定纸面；玻璃只留在导航及临时浮层。
- 字体：衬线大标题与无衬线正文形成清晰层级；文章标题与元数据不再被卡片稀释。
- 色彩：浅冰蓝纸面 + 藏蓝文字/链接/选中态，副色只用于边框、低对比元数据和深色模式。
- 布局：首页与其他页主内容起点一致；文章列表按发丝线形成扫描节奏，不再使用同款圆角卡片。
- 通用 AI 信号：已移除「玻璃覆盖多处」「统一圆角卡片」「默认渐变封面」「装饰抢过内容」。
- 仍需注意：线上文章含 `测试123` 等 CMS 测试内容，视觉验收不能把它们当作正式文案；内容需由用户在 Pages CMS 清理。

### 交互回归

`design/check-interactions.mjs` 在桌面 1440×900 与移动 390×844 均通过：

- 首页 / 归档 / 返回首页均只有一个正确 `aria-current` 选中态。
- 导航高度在桌面恒为 56px、移动端恒为 42px。
- 主内容起点在桌面恒为 104px、移动端恒为 84px。
- 切换后 `scrollY` 为 0，顶部栏与下方布局不再弹跳。
- `scrollWidth === clientWidth`，无横向滚动。

### 构建结果

- `pnpm check`：0 error / 0 warning / 1 hint（`document.execCommand` deprecated，既有提示）。
- `pnpm build`：通过；Pagefind 索引 4 页 / 287 词。
- 构建期 CSS 优化器对既有 Stylus 输出给出 1 条「Invalid token in pseudo element」警告，不影响产物生成；本轮未扩大范围修复模板遗留 Stylus。

### 状态

本地实现与截图验收完成；未提交、未推送，等待用户人工批准。

## Round 2 — 生产预览截图自审

### 范围

- 预览地址：`http://localhost:4321/flowli-blog/`，基于 `pnpm build` 后的 `dist/`。
- `design/audit-preview.mjs` 覆盖 13 个视图：首页浅色/深色/移动/reduced motion、文章、归档、关于、搜索展开与结果、主题色、明暗主题、翻译、移动菜单。
- `design/check-interactions.mjs` 覆盖桌面 1440×900 与移动 390×844 的 Tab 状态、导航高度、内容起点、滚动复位、横向滚动、浮层开关和移动菜单选中态。
- 截图输出：`design/screenshots/audit/`。

### 发现的问题

- 文章详情页的顶部 Tab 没有继承态；归档与文章之间切换出现语义断点。
- 主题色、翻译开关同时绑定 hover 打开和 click toggle，Playwright 点击会先 hover 再 toggle，导致面板刚打开即关闭。
- 明暗模式按钮仍是模板的 hover 打开 / click 切换主题；与「点击打开、Esc 或外部关闭」的浮层契约不一致。
- 主题色面板沿用模板的粉色彩条滑条，破坏藏蓝主色一致性。
- 文章页正文、元信息与授权块套用了模板低对比文字色，在白纸面上接近不可读。
- 移动端主内容贴边，封面和列表行占满 390px 视口；日期、元信息视觉上被裁切。
- 移动菜单透明度太高，底层首页大标题穿透菜单；选中态只在桌面导航同步。
- 归档页仍显示模板英文副标题 `A chronological list of all published posts.`。
- 右侧「正在写 / 关于我」公告卡与纸面编辑部的低调信息层级冲突。

### 修复

- `src/components/navbar/navLinks.astro`、`src/layouts/base.astro`：文章页继承「归档」选中态；桌面与移动菜单由同一套同步逻辑处理。
- `src/components/navbar/displaySettings.svelte`、`translator.svelte`、`lightDarkSwitch.svelte`、`navMenu.svelte`：改为 click 开关、Esc 关闭、外部点击关闭；补齐 `aria-expanded` / `aria-controls` / `aria-hidden`。
- `src/components/navbar/displaySettings.svelte`：主题色滑条改为藏蓝 → 亮蓝 → 冰蓝的细轨道和藏蓝圆形滑块。
- `src/styles/editorial-paper.css`：恢复文章正文、元数据和授权块的纸面对比度；统一浮层为高不透明纸面玻璃；移动菜单使用独立不透明材质并保留细微玻璃高光；移动端补齐主网格左右留白；移除残留英文文案对应的模板公告卡。
- `twilight.config.yaml`：移除右侧公告组件。
- `src/constants/link-presets.ts`：归档副标题改为「按时间整理的全部文章。」
- `design/audit-preview.mjs`、`design/check-interactions.mjs`：扩展截图与交互断言，新增搜索结果、主题色、明暗主题、翻译面板、浮层开合和移动菜单选中态检查。
- `design/DESIGN.md`：补充文章详情选中态与浮层开合契约。

### 验收结果

- `pnpm check`：0 error / 0 warning / 1 hint（`document.execCommand` deprecated，既有提示）。
- `pnpm build`：通过；Pagefind 索引 4 页 / 287 词。
- 13 张截图全部生成；所有页面 `scrollWidth === clientWidth`，`overflowing = 0`；文章页 `activeTabs = ["归档"]`，其余页面选中态符合路径。
- 桌面与移动交互回归全部通过：Tab 选中态、导航高度、内容起点、滚动复位、无横向滚动、浮层初始关闭、主题色/翻译/明暗/菜单开合、移动菜单选中态。
- 截图人眼复核：移动菜单不再透出底层标题；主题色面板不再出现粉色彩条；文章授权块和正文对比度恢复；归档副标题为中文；深浅色主色一致。
- 审计日志中的 console error 来自 Iconify API 的远程图标请求被浏览器 CORS / 网络策略拦截；本地生产预览使用了构建内的图标资源，截图显示正常，和本轮 CSS / 交互改动无关。
- `git diff --check`：通过。

### 状态

Round 2 自审与修复完成；预览继续保留在 `http://localhost:4321/flowli-blog/`。本地改动仍未提交、未推送，等待用户人工确认。

## Round 3 — 布局重构与 hover 稳定性

### 用户反馈

- 中间区域盒子视觉上被左右侧栏挤压，不是单页个例。
- 需要整体重构布局，检查 hover 不出现挤压或遮挡。
- 响应式布局要完整、融洽。

### 根因

- 模板使用 `17.5rem + 1fr + 17.5rem` 固定三栏，主栏宽度由两侧固定栏扣减；1280px、1024px 与平板档位尤其明显。
- `grid.astro` 动态注入多套 `md:grid-cols-*`、`lg:grid-cols-*` 与列起点类，Swup 切换时还会重写 `#main-grid` className；页面布局由模板状态驱动，无法稳定保证主内容优先级。
- 另一个视觉问题是左右侧栏在平板模式重复渲染右侧组件，导致资料卡重复。
- 模板页面散布 `group-hover:scale`、`translate: 0 -4px`、`hover:shadow-lg` 等会改变视觉占位的交互。

### 布局重构

- `src/layouts/grid.astro`：移除动态三栏、middle sidebar 与双 footer，改为语义化三段：`editorial-content-column`、`editorial-sidebar-rail`、`editorial-footer`。
- `src/layouts/base.astro`：移除 Swup 对 `#main-grid` 动态列类的重写；布局由 CSS 契约决定，页面切换不再改网格几何。
- `src/utils/widget.ts`：左侧栏不再并入右侧组件；`middle` 侧栏只渲染一次完整组件列表，并统一加 `editorial-rail-item`。
- `src/styles/editorial-paper.css`：新增 `--shell-max`、`--reading-max`、`--rail-width`、`--rail-gap`、`--shell-gutter` 布局令牌；主内容统一阅读宽度，侧栏在 1440px 以下下移成连续信息带，1440px 以上作为相对网格的绝对定位外挂信息带，不再参与主栏宽度扣减。
- 侧栏组件恢复为发丝线分隔的文字分组，不再显示为一张张等高卡片。
- 内容淡入的初始透明态被固定为 `opacity: 1`，避免截图与用户首屏看到过渡中间帧。

### hover 契约

- `#content-wrapper` 内所有链接、按钮、卡片、图片、菜单项的过渡属性收敛为颜色、背景、边框、透明度和极轻阴影。
- hover / focus-visible / group-hover 下强制 `translate: none`、`transform: none`、`scale: none`；几何变化不再发生。
- 首页 CTA、文章箭头、菜单卡、相册卡、项目卡、技能卡、时间线卡只在颜色或边框上反馈，不抬升、不放大、不改变 z-index。

### 几何回归

新增 `design/check-layout.mjs`，覆盖 390 / 768 / 1024 / 1280 / 1440 / 1920 六档，检查首页、归档、文章、关于四类页面：

- 主栏占满可用宽度；1440px 以上允许外挂信息带绝对定位。
- 主内容盒左右边界始终位于网格内。
- `scrollWidth === clientWidth`，无元素越界。
- 真实鼠标 hover 前后元素宽高、位置、transform / translate / scale 不变；同时补偿 hover 引起的页面滚动。
- 输出 `design/screenshots/layout/` 关键断点截图。

### 最终验收

- `pnpm check`：0 error / 0 warning / 1 hint（既有 `document.execCommand` deprecated 提示）。
- `pnpm build`：通过；Pagefind 索引 4 页 / 287 词。
- `design/check-layout.mjs`：六档 × 四类页面 × 4 项几何断言全部通过。
- `design/check-interactions.mjs`：桌面 1440×900 与移动 390×844 全部通过；Tab 状态、导航高度、内容起点、滚动复位、浮层开合、菜单选中态稳定。
- `design/audit-preview.mjs`：13 张截图全部生成；`overflowing = 0`、无横向滚动、文章页继承「归档」选中态。
- 人眼复核：桌面侧栏不再重复、窄屏与移动端主栏不再被挤压、侧栏以连续文字分组下移、文章正文首屏不再处于淡入中间态。

### 状态

Round 3 布局重构完成；预览继续保留在 `http://localhost:4321/flowli-blog/`。本地改动仍未提交、未推送，等待用户人工确认。

## Round 4 — 藏蓝液态玻璃视觉重构

### 用户反馈

- 用户明确表示当前设计「还是很丑」，此前偏浅色纸面的方案虽然整齐，但缺少个人气质与材质层级。
- 要求保留液态玻璃与藏蓝主色，同时避免早期「到处毛玻璃 + AI 模板感」的方向。

### 视觉方向

- 放弃浅色白纸 / 白卡列表，改为「夜间编辑台」：深藏蓝场域、单一大幅封面、衬线大字、折射高光与克制的玻璃表面。
- 首页结构改为：全宽夜间封面 → 单篇主文章玻璃面 → 写作台索引 → 低干扰页脚；首页不再渲染模板侧栏 widget。
- 内页与首页共享同一套藏蓝玻璃 token：导航、文章页、归档页、关于页、浮层、代码框、分页与页脚统一到同一材质与文字层级。
- 封面使用大字号衬线标题、日期、作者身份、发布数量与两个明确动作；去掉英文 eyebrow 与 `EST.` 式模板标签。
- 文章索引不再使用等宽白卡网格，改为日期编号 + 标题 + 摘要 + 圆形箭头的编辑式索引。
- 关闭文章页「上次编辑」倒计时卡，压缩旧模板上下篇按钮为低调玻璃页脚。

### 实现

- 新增 `src/components/home/cover.astro`、`featuredPost.astro`、`deskIndex.astro`，重写 `src/pages/[...page].astro` 的首页组合。
- `src/styles/editorial-paper.css` 重建全局色板与材质：深浅两套藏蓝底色、冰蓝文字、单一亮蓝强调、玻璃边框高光、稳定阴影与 `backdrop-filter`。
- `src/layouts/grid.astro`：首页从 DOM 层移除侧栏；其他页面保留信息带，避免旧资料卡与首页封面争抢焦点。
- `twilight.config.yaml`：关闭 `showLastModified`，去掉文章页模板感最强的运行时间卡片。
- `design/check-layout.mjs`、`design/audit-preview.mjs`：识别新的 `.night-cover`、`.desk-title` 与封面主按钮，继续覆盖 hover 几何与文本可见性。

### 截图自审

- 第一轮截图发现：旧右侧资料卡与封面并置割裂、文章页仍有旧式编辑提示、首页底部 widget 过长且低对比。
- 第二轮以首页 DOM 层移除侧栏、关闭旧编辑提示、收紧文章上下篇样式收尾；最终首页只保留封面、主文章、写作台与页脚。
- `design/screenshots/final/full/` 包含首页桌面 / 移动、文章、归档、关于的全页截图；`design/screenshots/final/audit/` 包含浅色、深色、移动、浮层等生产预览截图。
- 人眼复核：藏蓝主色贯穿全站；封面具有明确视觉重心；首页没有旧模板卡片堆叠；移动首屏没有横向裁切；内页材质与首页一致。

### 最终验收

- `pnpm check`：0 error / 0 warning / 1 hint（既有 `document.execCommand` deprecated 提示）。
- `pnpm build`：通过；Pagefind 索引 4 页 / 287 词。
- `design/check-layout.mjs`：6 档视口 × 4 类页面 × 4 项几何断言全部通过；装饰透镜不再触发越界判定，hover 前后几何与 transform 不变。
- `design/check-interactions.mjs`：桌面与移动全部通过；Tab 选中态、导航高度、内容起点、滚动复位、浮层开合与移动菜单状态稳定。
- `design/audit-preview.mjs`：13 个生产预览视图全部生成，无溢出与横向滚动。
- `git diff --check`：通过。

### 状态

Round 4 本地视觉重构完成；预览继续保留在 `http://localhost:4321/flowli-blog/`。本地改动仍未提交、未推送，等待用户人工确认。

## Round 5 — 入住式精修与上线收尾

### 范围

- 统一导航、封面和页脚的品牌标记：使用同一枚玻璃质感 `f` 字标，导航副标题在移动端自动隐藏。
- 主文章内容封面增加玻璃内衬和轻微色彩校准；无封面文章使用同材质「流」字占位。
- 分页选中项改为胶囊态，保持居中且 hover 不改变几何。
- 页脚从模板双行版权改为语义化 `footer.flowli-footer`：品牌、版权、RSS / Atom / Sitemap / Astro / GitHub Pages 一行组织，移动端自然换行。
- 内页信息带保留原有阅读几何，只改视觉：作者资料卡回到藏蓝玻璃托底；目录、分类和标签统一发丝线、微型章节标签和冰蓝计数胶囊。

### 验收

- `pnpm check`：通过，0 error / 0 warning / 1 hint（`document.execCommand` deprecated，既有提示）。
- `pnpm build`：通过；Pagefind 索引 4 页 / 287 词。
- `design/check-layout.mjs`：通过，6 档视口 × 4 类页面的无横向滚动、主栏主导、主盒在网格内与 hover 几何稳定断言全部通过。
- `design/check-interactions.mjs`：通过，Tab 选中态、导航高度、内容起点、滚动复位、浮层开合与移动菜单状态稳定。
- `design/audit-preview.mjs`：通过，13 个生产预览视图无溢出；截图复核文章页信息带层级和材质与首页一致。
- `git diff --check`：通过。

### 状态

Round 5 完成并准备正式推送上线；线上旧版已由 Round 4 的藏蓝液态玻璃版本替代，本轮将导航品牌、页脚与内页信息带一并同步到线上。
