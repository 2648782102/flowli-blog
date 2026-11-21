# 拟物风（Skeuomorphism）设计基础

## 定位

全站被当作**一张桌子**来布置：暖色桌面铺底，阅读区是一页纸，控件是搪瓷按键，站点头部是一条拉丝金属导轨，代码块和引用是从纸里挖出来的凹槽。

拟物最容易失败的地方，是给每个面都叠一层「上亮下暗」的全高渐变、四边描白边、底下糊一圈灰模糊——那样看起来像贴纸。`src/styles/skeuo.css` 开头把这条反模式写死在注释里：真实材质读起来是真的，前提是**底色是平的**。

## 四个要素

每个表面都按同一顺序由这四样构成：

1. **底色** — 一个平面色，永远不用全高渐变
2. **光** — 单一光源，来自左上方（代码注释记作 `145deg`）
3. **边** — 只在受光侧出现一条细亮边
4. **接触阴影** — 紧、深、贴着物体

渐变角度（`170deg`–`180deg`）只决定受光带落在物体内部哪个位置，不是第二个光源。

## 设计 Token

全部定义在 `src/styles/skeuo.css` 的 `html:root` 与 `html:root.dark` 里。

### 光源

- `--lit`：高光本身
- `--rim-strong` / `--rim-soft`：亮边强度，暗色主题下压到 `0.16` / `0.09`
- `--contact`、`--contact-tight`、`--ambient`：三档阴影浓度

### 材质色

| Token | 代表什么 |
| --- | --- |
| `--desk`、`--desk-deep` | 桌面 |
| `--paper-stock`、`--paper-stock-warm`、`--paper-fibre` | 纸 |
| `--enamel`、`--enamel-deep` | 搪瓷：卡片、控件 |
| `--metal-hi` / `--metal-mid` / `--metal-lo` | 拉丝金属 |
| `--well`、`--well-deep` | 凹槽 |
| `--foil`、`--foil-lit` | 全站唯一的饱和色 |

桌面和纸的明度必须拉开：以 L\* 计至少 8，否则会看成同一层平面上的印刷差异。

实测值（`--desk` → `--paper-stock`）：

| 主题 | 桌面 | 纸 | ΔL\* |
| --- | --- | --- | --- |
| 亮色 | `#dcd8ce`（86.4） | `#fdfbf5`（98.6） | 12.2 |
| 暗色 | `#101114`（5.1） | `#1c2430`（14.0） | 8.9 |

暗色曾长期停在 5.4：纸和桌面糊成一片，再怎么叠阴影也救不回来。暗色整套层级现在是单调递增的——

`desk 5.1 → well 12.4 → paper 14.0 → surface 15.3 → enamel 17.7 → float 19.1 → muted 20.8`

唯一例外是代码块 `--codeblock-bg`（L\* 约 7）：它是页面上最深的凹槽，刻意排在 `well` 之下，语法配色也是按近黑底调的。曾经试过把它提到 `well` 同色，结果代码块开始读成一块凸起的面板，整页层级反而变平。

有一处连带代价：纸提亮后，`--ink-faint` 的对比度从 4.57:1 掉到 4.21:1，低于附件文字 4.5:1 的下限。所以它同步从 `#77869a` 提到 `#7e8ea3`，恢复为纸面 4.68:1、卡片 4.51:1。改层级时要连带复核受影响的文字色。

`pnpm visual:check` 会断言这条阶梯：暗色必须严格递增、桌面到纸不得少于 8 L\*。改配色可以把数值挪动，但不能把两层压成一层。

凹槽刻意接近纸色——凹陷该由阴影定义；靠调暗底色会读成一块色块。

### 层级

每一档都是**成对的**「内亮边 + 接触阴影」，拆开用就会前后不一致：

| Token | 用途 |
| --- | --- |
| `--lift-1` | 按键、贴着纸面的卡片 |
| `--lift-2` | 阅读纸页 |
| `--lift-3` | 悬停抬起 |
| `--lift-float` | 浮在页面之上的面板 |
| `--sink-1` / `--sink-2` | 凹槽 / 更深的读数槽 |

### Legacy aliases

`--mat-surface` 与 `--mat-surface-raised` 是旧名，两者现在**都等于 `--enamel`**。所以不要再写 `linear-gradient(var(--mat-surface-raised), var(--mat-surface))`——那是一条同色到同色的渐变，画不出任何东西，直接写 `var(--mat-surface)`。

## 材质分配

`skeuo.css` 定义材质长什么样，`skeuo-materials.css` 决定站内每个部件用什么材质：

| 部件 | 材质 |
| --- | --- |
| 页面背景 | 桌面：平面暖色 + 一层极宽的左上光池 + 极淡织纹 |
| 站点头部 | 金属：细竖拉丝 |
| 文章页 | 纸：唯一的大纸面 |
| 卡片、按钮、浮层 | 搪瓷：更冷、更亮，压在纸上面 |
| 代码块、引用、统计 | 凹槽：从所在材质里挖出来 |

页内卡片在纸面上若继续用纸，两层同明度的纸会融成一片，所以子卡片必须换成搪瓷才能读成独立物体。

当前**没有**玻璃、皮革、橡胶三类材质：早期的 `glass` / `leather` / `rubber` 已随调色板重构移除；`theme.css` 里残留的 `--glass-*` 只是结构层的兜底别名，指向 `--surface` 与 `--hairline`。

### 悬停与选中不该加光

凡是状态变化（`:hover`、`.is-active`）都不再叠一层整高白色渐变。列表行悬停换底色 + 1px 受光边，头部选中项是压进导轨的一层薄影，面板里的菜单项换搪瓷底色即可。

整高渐变在暗色主题下尤其糟：同一段白色高光落在 `--enamel` 上，会变成一条横贯整行的白带，看起来像贴了一张亮条，而不是纸张受光。全站的 `:hover` 规则里现在没有任何 `background-image: gradient`。

## 纸页边缘（`.scroll-edge`）

`.scroll-edge` 只用在两处：首页最新文章的精选卡（`src/pages/[...page].astro`）和文章底部的版权卡（`src/pages/posts/[...slug].astro`）。

现在的实现是「一页平铺的纸」：

- 底色 `--paper-stock`
- 顶部一条 `2px` 内收的受光带，最远到 `2.4rem`（暗色主题压到 `1.6rem`）
- 纸纹 `public/assets/scroll/paper-{light,dark}.png`，256px 平铺，`multiply` 混合（两种主题同一张板）
- 三层投影，从接触线到环境散射

**没有卷边。** 旧版用 `.scroll-edge::before` 叠 `curl-left-{light,dark}.png` 做左缘卷起，并在精选卡和版权卡上额外留了约 `2.3rem` 的左侧内边距。这套卷边已删除：卷冠在深色主题下发灰，边缘还会出现暗竖条，与「纸」的读法冲突。因此正文**不再需要为左缘预留内边距**。

`scripts/generate-scroll-assets.mjs` 仍会生成 `curl-left-*.png`，但页面已不引用；保留脚本是为了素材可再生、需要时能回退。

## 立轴挂画

首页两侧的挂画是中式立轴，不是画框：

- 组件：`src/components/common/hangingScroll.astro`
- 素材：`public/assets/art/scroll-wanghui.webp`（王翚，1693）与 `scroll-morikage.webp`（久隅守景，17 世纪），各带一个 480px 的 `-sm.webp`
- 来源：画心与暗花绫装裱裁自大都会博物馆的公有领域实物照片，CC0

三点值得注意：

1. **没有地杆。** 木轴加骨质轴头在展示尺寸下会读成上漆塑料，所以挂画止于裸纸边，由纸面自身的轮廓和投影承担构图底部；天杆是细的丝包杆，不伸出绫边。
2. **烘焙出的对象不打光。** 装裱照片本身带着适合丝绸的展厅光，再走一遍场景主光会把暗花绫打爆成白色。所以纸页与天杆都按原色绘制，只乘上由曲率算出的形变明暗。
3. **页面不做边缘渐隐。** 透明混合会把纸拉向背景，深色主题下长出灰晕。深度全部交给 CSS `drop-shadow`：亮色与暗色各三层，分别贴合各自的背景明度。

布局上，挂画固定在视口、不随正文滚动；宽度与高度都由 `theme.css` 的 `--home-column`、`--wall-height`、`--wall-edge`、`--wall-pull` 推导，所以 1080p / 1440p / 4K 构图一致。窗口窄于 `1240px` 时两侧留白不足，直接隐藏。

加载上，两幅图都在 `<head>` 里 `preload`，并且是 `loading="eager"`。它们原本是 `lazy`，但正是首屏最大元素（270KB + 190KB）。更糟的是右幅：它排在文档靠后，解析器遍历完整个文章列表才看见它——限速实测，左幅 97ms 开始加载，右幅要等到 **1191ms**，右边有一秒钟是空墙。现在两幅同时于 87ms 发起。

重新烘焙：

```sh
node scripts/bake-scroll/bake.mjs
```

需要本机 Chrome 与 `puppeteer-core`，两者都不是站点依赖。输出是确定性的，重跑得到逐字节相同的 WebP。更多细节见 `public/assets/art/README.md`。

## 组件现状

| 部件 | 位置 |
| --- | --- |
| 材质工具类（`.mat-paper` / `.mat-enamel` / `.mat-metal` / `.mat-well` / `.mat-readout` / `.mat-float` / `.mat-key`） | `src/styles/skeuo.css` |
| 头部导轨 | `src/styles/site-header.css` + `src/components/chrome/SiteHeader.astro` |
| 按钮 | `.btn-card`、`.btn-regular`（`skeuo-materials.css`） |
| 浮层（搜索、翻译、主题） | `skeuo-materials.css` 中的 `#search-panel`、`#translate-panel`、`#light-dark-panel` |
| 归档 / 工具页 | `skeuo-archive.css`、`skeuo-tools.css` |

交互组件是 Svelte 5，按需自己上材质。项目**没有**引入 Bits UI，也没有独立的 Switch 组件——主题切换是一个菜单（`src/components/navbar/lightDarkSwitch.svelte`）。

`.mat-*` 是可套用的工具类，但当前标记里没有使用：页面都由 `skeuo-materials.css` 的选择器直接赋材质，所以改这些类不会影响现有页面。

## 技术约束

- 保持 Astro 静态生成，不引入运行时 SSR
- 页面切换由 Swup 接管，新样式要能在 `#swup-container` 内重新生效
- 材质优先走 CSS 变量；`rgb()` 形式的亮边与阴影仍有硬编码，改色时优先补 token，而不是继续堆数值
- 动画与按压反馈尊重 `prefers-reduced-motion`
- `prefers-contrast: more` 下给实际赋材质的选择器加一圈内描边（`--hc-edge`，亮色 62% 墨、暗色 55% 白）：纸页、按钮、浮层、页脚徽记、代码块/引用/表格、版权卡。头部下沿的覆盖写在 `site-header.css`，因为它在 `skeuo-materials.css` 之后加载

## 运动：材质的时间维度

材质不只描述「多高」，也描述「多重」。抬得高的东西落得慢，压在纸上的键回弹快，这两件事必须来自同一套数值，否则动起来就会露馅：静止时是纸，一动就成了控件。

### 三档时长

定义在 `src/constants/transitions.ts`，经 `base.astro` 注入为 CSS 变量，`skeuo.css` 再用 `--motion-*` 暴露给样式：

| 令牌 | 值 | 用在哪 |
| --- | --- | --- |
| `--motion-press` | 100ms | 按下：键向槽里走 1px |
| `--motion-touch` | 140ms | 悬停：小物件回应指针 |
| `--motion-settle` | 300ms | 沉降：纸页改变高度 |

只有三档。之前有七种几乎相同的悬停时长（120/130/140/150/160/180/220ms），肉眼分不出来，每写一条新规则还得猜一个。

### 缓动

- `--ease-settle`（`cubic-bezier(0.22, 0.61, 0.36, 1)`）：减速入位。东西被放下时是先慢后停，不是线性到位
- `--ease-lift`（`cubic-bezier(0.34, 1.32, 0.64, 1)`）：带一点过冲，用于「被抬起又放下」的面板

### 交互配方

`skeuo.css` 末尾的 Interaction 段给材质选择器统一了行为，不再逐条手写：

| 状态 | 小物件（按键、导航项、CTA） | 整张纸（卡片、作品、时间线） |
| --- | --- | --- |
| 静置 | `--lift-1` | `--lift-2` |
| 悬停 | 抬起 1px + `--lift-2` | 抬起 2px + `--lift-3` |
| 按下 | 下压 1px + `--sink-1` | 下压 1px + `--sink-1` |

位移只负责让变化不像印上去的，深度始终由阴影承担。`prefers-reduced-motion: reduce` 下保留阴影、去掉位移：直接无视反馈会显得坏掉，比不动更糟。

## 特效：两处，都很克制

`src/styles/motion.css` 只有两个效果，都用平台能力驱动，没有滚动监听脚本。

### 1. 纸页受光随位置变化

桌面只有一盏灯。纸页往滚出灯光，顶部受光带就该变弱，滚回来又恢复。

- `@property --sheet-catch`（`skeuo.css`）把受光强度声明成可插值的数字，默认 `1`
- 材质层用 `calc(0.72 * var(--sheet-catch))` 缩放受光带的 alpha，材质的定义仍然只有一处
- `motion.css` 用 `animation-timeline: view()` 驱动它：`entry 0% → exit 100%`，从 1 降到 0.4

只作用于高于视口的纸页（文章页、精选卡）。矮卡片整块都在灯下，给它加动画只会让页面滚动时到处闪。

### 2. 换主题 = 挪灯

站点是一个场景，换主题不是逐元素变色，而是同一间屋子重新打光。`applyThemeToDocument` 把 class 翻转交给 `document.startViewTransition`，`motion.css` 给 `::view-transition-old/new(root)` 设 320ms + `--ease-settle`。不支持视图过渡或用户要求减少动效时，回退到原来的「冻结过渡 → 单帧换色」路径。

刻意不给单个元素起 `view-transition-name`：那样每张卡片会各自淡入淡出，而这里要的是整间屋子一起亮起来。

### 材质陷阱备忘

- **纸纹的混合模式**：这条踩过两次坑，值得写清楚。

  第一次是**颜色**：旧纹理是接近白色的噪声板（均值 246.5）。叠在深色纸上，`overlay` 会把它抬到 `#2c3847`、`soft-light` 抬到 `#545c65`，整张卡读成藏蓝面板。

  第二次是**它根本不存在**：换成 `soft-light` 后颜色对了，但 `soft-light` 和 `overlay` 都以**底色**为基准，在接近白色的纸（253/255）上斜率只有 0.016——±1 级的纹理只能产生 ±0.016 级的输出。声明在、图片在、渲染出来是一片纯色。当时量到整张卡只有唯一灰度 253。

  结论是：纸纹必须走 `multiply`（各底色下斜率都约 1），并且纹理板要**以白色为基准**——`multiply` 只能变暗，白色即"无变化"。现在的板是 224–254，σ≈3，实际效果是 ±3 级的细齿加偶发纤维痕，放大可见、阅读距离几乎无感。
- **给祖先加动画要小心 `position: fixed`**：给 `#content-wrapper` 加 `filter` 动画会让它成为 fixed 后代的包含块，首页两侧挂画会掉到正文上。沉降动画因此只作用于纸页本身的 `box-shadow`
- **同一元素上的两段动画必须写进同一条 `animation` 简写**：分成两条规则，后写的会把前面的整个覆盖（滚动受光带曾被沉降动画悄悄顶掉）
- **不要用 ID 选择器接管页面过渡**：Swup 通过 `[class*="transition-swup-"]` 找要等待的元素，并在 `is-changing` 期间测量。`#content-wrapper` 上的 ID 规则会压过类规则，让位移没有过渡；`is-changing` 期间写 `transition: none` 会让 Swup 直接跳过动画

## 视觉回归检查

```sh
pnpm build
pnpm visual:check          # 与基线比较，输出差异图到 design/screenshots/local/
pnpm visual:baseline       # 变更是有意的，刷新基线
```

固定 4 个页面 × 亮/暗两套主题（首页、文章、归档、作品），1440×1000，冻结动效偏好后截图做像素比较；随后在同一个标签页里跑一组结构化断言：头部必须是拉丝金属而不是毛玻璃、深色纸不能被纹理抬亮、纸面必须真的带纹理层、暗色层级必须递增、`#swup-container` 必须带过渡、挂画祖先不能有动画、首屏挂画不能 `lazy`、真实点击必须进入 Swup 的动画阶段。

这套检查来自三次真实回归——它们都「看起来还行」，靠肉眼漏掉了。基线在 `design/screenshots/baseline/`，需要提交；`local/` 与临时 profile 已被 `.gitignore` 忽略。基线用无损 WebP 存（与 PNG 逐像素相同，体积约为 60%，8 张图共约 3MB）；需要原生 PNG 时，脚本里把 `webp()` 换回 `toFile(*.png)` 即可。

两点实现细节，都是踩过坑之后加的：

- **比对容差是 4，且零容忍**：12 太松，能让真实的色阶漂移（4 级差异肉眼已能看出是另一层材质）溜过去。同一次截图重跑，差异严格为 0，所以容差只需要盖住文字抗锯齿。
- **`--update` 只在真的不同时才写文件**：分页控件上有几个像素每次重新编码都会差 ±1，盲目覆盖会把噪声存成新二进制，让每次更新都改动仓库。现在会先比对，等价就跳过。
