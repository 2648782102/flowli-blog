# 性能与构建逻辑

这份文档记录 2026-11-21 那轮优化：改了什么、为什么改、怎么验证，以及
**还剩下什么问题**。数字都来自本机 `astro preview` + 无头 Chrome（CDP）
的实测；本地不压缩，所以文中的 `br` 体积是用 brotli 估算的，接近 GitHub
Pages 的真实传输量。

## 优化前的基线

| 指标 | 首页 | 文章页 | 技能页 |
| --- | --- | --- | --- |
| 首屏 CSS（原始） | 380 KB | 380 KB + `ec` | 380 KB |
| 首屏 CSS（brotli） | 约 57 KB | 约 57 KB | 约 57 KB |
| 渲染阻塞 | Google Fonts CSS 212 KB | 同左 | 同左 |
| 运行时图标请求 | 0 | 0 | **25** |
| FCP | 1.2–2.0 s | 0.7–1.1 s | 1.1 s |
| 构建耗时 | 约 29 s | | |

用 CDP 逐条核对选择器是否有匹配元素：首页加载的 2407 条规则里 **2037 条
零匹配（84%，约 309 KB）**，文章页 61%，技能页 78%。

## 做了什么

### 1. 图标改为纯构建期内联

`src/components/common/icon.astro`、`icon.svelte` 只在静态表里查图标，
命中就输出内联 SVG，缺失就在**构建期抛错**。删除了 `iconifyLoader.astro`：
它把已经内联好的图标又塞进 `preloadQueue`，运行时逐个 `fetch`
`api.iconify.design`。技能页与时间线页因此各少了 25 个第三方请求。

`scripts/generate-icons.js` 现在会在无法解析某个图标时直接失败，而不是
留到运行时变空白。它扫描 `src` 下的 `.astro/.svelte/.json`，所以内容文件
里写的图标也会被收录。

### 2. KaTeX 按需

以前 `base.astro` 全局 `import "katex/dist/katex.css"`，这份样式占共享 CSS
的 **15%**，而全站没有任何一篇文章使用公式。

现在：构建时把 `katex.min.css` 与字体复制到 `dist/katex/`
（`scripts/build-with-pagefind.cjs` 的 `copyKatexAssets`），文章页只在正文
里出现 `$...$` / `$$...$$` 时才输出 `<link data-katex>`。Swup 切页时按
「页面里是否真的有 `.katex` 元素」增删，避免跨页残留。

### 3. Fancybox 点击后才加载

`base.astro` 以前每次 `page:view` 都 `initFancybox()`；只要页面上有一张
正文图，就立刻 `import("@fancyapps/ui")`（约 109 KB）。而多数访问者从不
点开图片。

现在 `armFancybox()` 只挂一个捕获阶段的 click 监听，真的点到可缩放图片时
才加载库、绑定，再把这次点击重新派发给 Fancybox 自己的监听——分组、
键盘、手势行为不变。

库的样式表也不能用 `import()`：Vite 会把它写进 `__vite__mapDeps`，然后
给每个入口页生成一条 `<link rel="stylesheet">`，所谓「懒加载」其实每次
都同步请求。所以改为复制成静态文件
（`dist/vendor/fancybox.css`、`dist/vendor/fancybox-theme.css`），由
`fancybox.ts` 在加载库时注入。

### 4. 字体不再阻塞渲染

`twilight.config.yaml` 配了两个 Google Fonts 字体族，CSS 合计约 212 KB，
是整个首屏唯一真正的渲染阻塞项。`fontLoader.astro` 改为
`media="print"` + `onload` 切回 `all`，配合 `noscript` 兜底；字体本身仍是
`font-display: swap`，首屏先用系统字体（fallback 里已有 PingFang SC）。

首页 FCP 由 644 ms 降到 276 ms。

### 5. 构建期逻辑

`src/utils/post.ts`：

- `git log` 从「每篇缺 `published` 的文章各跑一次」改成整库一次
  `loadGitDates()`，按「文件 → 首次提交日期」查表。原来的写法是 N+1，
  每次都是一个同步子进程。
- `getCollection` 收敛到一个 `getPublishedPosts()` 缓存；排好序的文章列表
  也有 `sortedPostsCache`；prev/next 链接只在首次计算。

构建耗时由约 29 s 降到约 12.7 s。

## 优化后

| 指标 | 首页 | 文章页 | 技能页 |
| --- | --- | --- | --- |
| 首屏 CSS（原始） | 248 KB | 270 KB | 248 KB |
| 首屏 CSS（brotli） | 38 KB | 42 KB | 38 KB |
| 首屏 JS | 62 KB / 20 KB br | 79 KB / 27 KB br | 77 KB / 26 KB br |
| 运行时图标请求 | 0 | 0 | **0** |
| FCP | 52–276 ms | 20–44 ms | 36 ms |

## 已知但仍未解决

**CSS 仍然是全局的。** 每页固定加载 4–5 个 CSS，首页约 82% 的规则匹配不到
任何元素。拆分成「按页面导入」试过两次，都没有达到预期：

- 把 `markdown.css` / `markdown-extend.generated.css` / `expressive-code.css`
  从 `editorial-paper.css` 挪到页面级后，原始体积从 248 K 降到 212 K，
  但它们会被并进页面级 chunk，另有一部分仍以 101 条 `.custom-md` 规则
  出现在全局包里——来源是 Astro 对 `@layer` 的合并方式，不是简单的
  `@import` 重复。
- 相册与统计规则各只占 3%，单独拆分收益不足以覆盖复杂度。

**要真正解决**，需要把 `skeuo-*`、markdown、相册等拆成按页面导入的 CSS 入口，
并确认页面级 chunk 不会因为多个页面共用而被提升回全局包。这是一次结构性
改动，做之前应该先用 CDP 覆盖率脚本建立回归基线。

**`main.css` 里的 17 个 `@utility` 在源码中没有引用，但删除它们不会减小
产物**——已实测这些类在 `dist/_astro/*.css` 中出现 0 次，Tailwind 的
按需裁剪已经把未使用的 utility 剔掉了。清理它们只有可读性收益。

**字体已自托管。** 2026-11-24 起，Noto Serif/Sans SC 不再引用 Google Fonts：
`scripts/download-font-sources.py` 从 Google Fonts CSS 下载源 TTF，
`scripts/generate-site-fonts.mjs` 用 fontTools 按站点内容与常用标点切成 7 个
woff2（3 档 Serif + 4 档 Sans），放在 `public/assets/fonts/noto/`。
字体声明由 `fontLoader.astro` 直接输出，首屏不再请求 300–450 KB 的第三方
CSS，也不再依赖 `fonts.googleapis.com` / `fonts.gstatic.com`。
字体子集只包含当前站点用字；新增常用字后运行 `pnpm font:site` 重新切字。

## 验证方法

```sh
pnpm run build
npx astro preview --port 4510
```

然后用无头 Chrome 连 CDP，在页面加载后读取
`performance.getEntriesByType('resource')` 统计请求与传输量，并用
`document.styleSheets` 遍历规则、`querySelectorAll(selector)` 判断是否有
匹配元素，得到「零匹配规则占比」。

注意：并发跑多个 preview 时先确认端口归属（`lsof -a -p <pid> -d cwd`），
否则可能测到另一个工作树的服务，得到完全错误的数据。
