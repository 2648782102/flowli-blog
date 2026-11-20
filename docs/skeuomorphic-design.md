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

桌面和纸的明度必须拉开 8–10%：差 2–3% 会看成印刷错误，而不是两层平面。

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
- 纸纹 `public/assets/scroll/paper-{light,dark}.png`，512px 平铺，分别用 `soft-light` / `overlay` 混合
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
