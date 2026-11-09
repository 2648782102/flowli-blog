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

## 项目结构

- `src/pages`：静态页面与 RSS/Atom/Sitemap 等端点。
- `src/components`：导航、卡片、侧栏与交互组件。
- `src/styles`：液态玻璃系统、藏蓝调色板与各模块样式。
- `src/content`：文章、作品、技能、时间线和页面正文。
- `public/favicon`：站点图标、浏览器标签图标与 PWA manifest。

## 视觉风格

全站使用藏蓝主色与统一的液态玻璃表面系统：导航、卡片、侧栏和浮层共享同一组光学变量、边缘高光和交互状态。桌面 Chromium 会在导航胶囊边缘使用 SVG `feDisplacementMap` 对实时背景做轻微折射，并叠加方向性镜面高光；Safari、Firefox、手机、减少透明度偏好和不支持 `backdrop-filter` 的环境自动使用克制的冻结玻璃回退。

这是浏览器环境下的渐进增强近似，不是 Apple 系统控件的原生实时光学渲染；实现位于 `src/styles/liquid-glass.css`、`src/styles/liquid-glass-system.css`、`src/styles/navy-liquid-glass-palette.css` 和 `src/components/liquidGlassFilter.astro`。技术方向参考了 [Nordify 的 CSS/SVG 折射研究](https://github.com/nordify/css-liquid-glass) 与 Apple 的 [Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials)。

## 模板来源

项目最初基于 [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight)，现已完成个人化重构；遵循 MIT License，原始许可保留在 [LICENSE](LICENSE)。
