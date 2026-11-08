# 云的个人博客

基于 Astro 和 Twilight 模板。文章保存在 GitHub 仓库，GitHub Pages 在每次更新后自动发布。

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

## 视觉风格

站点把玻璃严格限制在导航和临时菜单这一功能层：正文卡片、侧栏和按钮保持不透明的纸张式表面，避免正文被模糊或折射干扰。桌面 Chromium 会在导航胶囊边缘使用 SVG `feDisplacementMap` 对实时背景做轻微折射，并叠加方向性镜面高光、亮/暗边缘和指针响应；滚动时胶囊会提高不透明度与阴影。Safari、Firefox、手机、减少透明度偏好和不支持 `backdrop-filter` 的环境自动使用克制的冻结玻璃回退。

这是浏览器环境下的渐进增强近似，不是 Apple 系统控件的原生实时光学渲染；实现位于 `src/styles/liquid-glass.css`、`src/components/liquidGlassFilter.astro` 和 `src/components/navbar.astro`。技术方向参考了 [Nordify 的 CSS/SVG 折射研究](https://github.com/nordify/css-liquid-glass) 与 Apple 的 [Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials)。

## 模板来源

网站基于 [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight)，遵循 MIT License；原始许可保留在 [LICENSE](LICENSE)。
