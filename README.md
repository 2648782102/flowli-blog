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

站点采用「液态玻璃」网页近似实现：浅色与深色主题、柔和背景光晕、半透明胶囊导航与悬浮面板、清晰的正文层。玻璃层主要用于导航、按钮和卡片边缘，正文保持高对比度；桌面端启用适度的背景模糊，手机端、系统减少透明度和不支持 `backdrop-filter` 时使用高不透明度回退。受浏览器能力限制，它不包含原生系统的实时折射效果。视觉实现位于 `src/styles/liquid-glass.css`。

## 模板来源

网站基于 [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight)，遵循 MIT License；原始许可保留在 [LICENSE](LICENSE)。
