---
title: 用 Astro 5 内容集合搭博客 几个实操记录
published: 2026-11-12
description: 从 Markdown 到 GitHub Pages，搭一个静态博客时会真实遇到的 schema、base 路径、搜索和无刷新跳转问题。
category: 前端工程
tags:
  - astro
  - static-site
  - github-pages
draft: false
---

这个博客用的是 Astro 5 加 Svelte 5 加 Tailwind 4，部署在 GitHub Pages。搭建过程中有几个点值得记下来，免得下次重来一遍。

## 内容集合用 glob loader

文章放在 `src/content/posts/`，用 glob loader 自动读取。schema 里我用 `z.preprocess` 处理空字符串的日期字段，因为从旧系统迁移过来时，有些文章的日期是空串，直接 `z.coerce.date()` 会得到 1970 年。先归一化，再校验：

```ts
const optionalDateSchema = z.preprocess(
  (arg) => (typeof arg === 'string' && arg.trim() === '' ? undefined : arg),
  z.coerce.date().optional(),
);
```

loader 的 pattern 写 `**/[^_]*.{md,mdx}` 很有用：以 `_` 开头的文件会被忽略，可以放草稿模板或者临时文件，不会出现在站点里。

## GitHub Pages 的 base 路径

仓库名是 `flowli-blog`，Pages 的地址是 `/flowli-blog/`，所以 Astro 配置里必须有 `base: '/flowli-blog'` 和对应的 `site`。所有站内链接要用 `import.meta.env.BASE_URL` 或者封装过的 `url()` 工具生成，别手写绝对路径。否则本地开发是好的，一上线所有资源 404。

## 搜索要在构建之后建索引

Pagefind 不能边开发边用，它索引的是构建产物。我的做法是：开发环境返回一个 mock 结果，让 UI 能走通；构建时先 `astro build` 再 `pagefind --site dist`；运行时在页面里动态加载 `/pagefind/pagefind.js`，加载完派发一个自定义事件通知搜索组件。

这里有个坑：pagefind 的加载脚本最初写在导航栏组件里。后来导航栏重写，整段脚本被删掉，线上搜索就静默失效了，页面上有搜索框，输入也有结果面板，但永远是空的。迁移组件时，一定要检查它有没有夹带这种看不见的副作用。

## 无刷新跳转要同步容器外的状态

我用了 Swup 做页面切换，但只替换 `#swup-container`。导航栏在这个容器之外，所以客户端跳转后，浏览器的 URL 变了，导航栏的高亮还是旧的。

解决办法是在页面切换事件里，按当前 URL 重新同步 aria-current。服务端渲染时算一遍，客户端跳转后再算一遍。两边的匹配逻辑要一致，我把归一化路径（去掉尾部斜杠）抽成公共函数，避免 SSR 和 CSR 判断结果不同。

## 小结

静态博客的难点不在生成 HTML，而在这些边角：schema 要容忍脏数据，base 路径要贯穿所有链接，搜索索引要在构建后生成，无刷新跳转要记得容器外的世界。每个都不难，但每个都会在你以为已经做完的时候冒出来。

想看完整配置，可以直接翻这个博客的仓库：`https://github.com/2648782102/flowli-blog`。
