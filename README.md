# flowli 的个人博客

基于 Astro 的静态个人博客。文章保存在 GitHub 仓库，GitHub Pages 在每次更新后自动发布。日常写作使用 Pages CMS；仓库中的 `.pages.yml` 是唯一生效的内容后台配置。

## 写文章

1. 打开 [Pages CMS](https://app.pagescms.org/) 并使用 GitHub 登录。
2. 首次使用时，为 `2648782102/flowli-blog` 安装 Pages CMS GitHub App。
3. 选择 `flowli-blog` 仓库，在“文章”里新建文章、上传图片并保存。
4. 保存后 GitHub Actions 自动构建，完成后网站会更新。

Pages CMS 将编辑直接保存回仓库；首次安装时只给它访问这个博客仓库的权限即可。官方快速开始：[Pages CMS Quick start](https://pagescms.org/docs/quick-start/)。

## 网站

仓库名为 `flowli-blog`，GitHub Pages 地址为：

`https://2648782102.github.io/flowli-blog/`

第一次发布前，请在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。随后在 **Actions** 标签页等待部署完成。

## 本地预览

需要 Node.js 20+ 和 pnpm：

```sh
pnpm install
pnpm dev
```

改动材质、动画或配色后，跑一次视觉回归（固定 4 个页面 × 亮/暗两套主题）：

```sh
pnpm build
pnpm visual:check     # 与基线比对，差异图输出到 design/screenshots/local/
pnpm visual:baseline  # 确认改动是有意的，刷新基线
```

除像素比对外，脚本还会断言几条容易静默失效的材质规则（头部必须是拉丝金属、深色纸不能被纹理抬亮、页面过渡必须挂在 Swup 测量的元素上）。细节见 `docs/skeuomorphic-design.md`。

## 项目结构

- `src/pages`：静态页面与 RSS/Atom/Sitemap 等端点。
- `src/components`：导航、卡片、侧栏与交互组件。
- `src/styles`：按 `foundation/`、`tokens/`、`materials/`、`layout/`、`components/`、`motion/` 六层组织的样式系统；入口顺序写在 `src/layouts/base.astro`。详见 [CSS 架构](docs/css-architecture.md)。
- `src/content`：文章、作品、技能、时间线和页面正文。
- `public/favicon`：站点图标、浏览器标签图标与 PWA manifest。
- `public/assets/fonts/noto`：自托管的 Noto Serif/Sans SC 字体子集。

## 视觉风格

全站是拟物风的「一张桌子」：暖色桌面、纸页正文、搪瓷卡片与控件、拉丝金属头部、从纸里挖出的凹槽。材质定义在 `src/styles/materials/skeuo.css`，各部件用哪种材质写在 `src/styles/materials/skeuo-materials.css`，调色板在 `src/styles/tokens/theme.css`；`src/styles/foundation/editorial-paper.css` 只负责结构与 Markdown 排版。页面切换由 Swup 处理。完整说明见 [拟物风设计基础](docs/skeuomorphic-design.md)。

## 模板来源

项目最初基于 [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight)，现已完成个人化重构；遵循 MIT License，原始许可保留在 [LICENSE](LICENSE)。
