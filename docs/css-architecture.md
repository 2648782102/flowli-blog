# CSS 架构

目标模式是「**单一入口清单 + 语义分层目录 + 构建期校验**」。视觉规则本身
尽量保持原样，工程结构按职责重排；这样能在不改变像素结果的前提下，让新增
样式有明确落点，并阻止 import 顺序悄悄漂移。

## 目录职责

| 目录 | 职责 | 允许内容 |
| --- | --- | --- |
| `src/styles/foundation/` | 全局基础与第三方基础 | Tailwind 入口、Markdown 基础、排版生成物、相册与过渡基础 |
| `src/styles/tokens/` | 纯 token 与主题变量 | `theme.css` |
| `src/styles/materials/` | 拟物材质与材质分配 | `skeuo.css`、`skeuo-materials.css`、灯箱材质 |
| `src/styles/layout/` | 页面骨架与栅格 | `site-layout.css`、`skeuo-layout.css` |
| `src/styles/components/` | 具体部件外观 | 头部、归档、首页、阅读页、工具页 |
| `src/styles/motion/` | 动画与过渡 | `motion.css` |

`src/styles/*.styl` 是生成源，不属于分层 CSS。生成物放在 foundation。

## 入口与顺序

唯一入口是 `src/layouts/base.astro` 里的 CSS import 清单。顺序就是层叠契约：

1. foundation：先建立 reset、Tailwind、Markdown 基础；
2. tokens：再定义亮暗主题变量；
3. materials：把材质分配到具体语义表面；
4. components：覆盖具体部件；
5. layout：决定栅格和页面骨架；
6. motion：最后声明动画。

除 `foundation/editorial-paper.css` 和 `foundation/main.css` 外，分层文件
不得再使用 `@import`。需要新样式时，在对应层新增文件，并把 import 加到
入口清单的正确位置。

## 约束

- 不在 CSS 里硬编码 `/flowli-blog` base；用根路径让 Vite 自动补 base。
- 不通过中间 CSS 文件转发入口 import；Tailwind 的 `@reference` 依赖入口顶点。
- 布局选择器仍然依赖一部分历史 ID 特异性；批量降特异性会改变代码块层叠，
  因此必须在单个部件内逐项替换，并运行 `pnpm visual:check`。
- 新增或修改样式后必须跑：

```sh
pnpm css:check
pnpm build
pnpm visual:check
```

`css:check` 会验证目录归属、入口顺序、禁止的 `@import` 和硬编码 base。
