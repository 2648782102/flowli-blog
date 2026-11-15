---
title: hover 位移 2px 为什么会出现横向滚动
published: 2026-11-13
description: 语言下拉在 hover 时冒出横向滚动条。一个关于 overflow 隐式行为和 transform 影响滚动区域的排查记录。
category: 前端工程
tags:
  - css
  - debugging
  - overflow
draft: false
---

语言下拉菜单 hover 某一项时，右边会冒出一条横向滚动条。不 hover 就没有。听起来像都市传说，但它有完全合理的解释。

## 现象

面板宽度 256px，内部列表可用宽度 224px。我量了 hover 前后：不 hover 时 `scrollWidth` 是 224，`overflow-x` 显示 auto；hover 时 `scrollWidth` 变成 226，`overflow-x` 还是 auto。差出来的 2px，正好是我给选项写的位移 `transform: translateX(2px)`。

## 原因有两层

**第一层：overflow 的隐式行为。**

列表容器写的是 `overflow-y: auto`。按照 CSS 规范，当 `overflow-x` 和 `overflow-y` 其中一个不是 `visible` 也不是 `clip` 时，另一个的 `visible` 会被计算成 `auto`。所以这个容器实际是纵向可滚、横向也可滚，只是平时内容没超宽，看不到。

**第二层：transform 会撑大可滚动区域。**

transform 不改变布局，但它会把元素绘制到新位置，而这个新位置会被算进滚动容器的 scrollable overflow area。选项右移 2px，最右边就超出了容器 2px，横向滚动条就出现了。

两个条件单独拿出来都无害，碰到一起就成了这个诡异的现象。

## 修复

有两个方向，我两个都做了。

第一，**去掉横向位移**。面板选项的 hover 反馈不需要靠位移，背景色、阴影、文字颜色已经足够表达可点击：

```css
.panel-item:hover {
  background: var(--enamel);
  box-shadow: var(--lift-1);
  color: var(--ink);
}
```

第二，**显式声明 overflow-x**。就算以后有人加了位移或阴影外扩，也不会再触发横向滚动：

```css
.language-list {
  overflow-y: auto;
  overflow-x: hidden;
}
```

`transform: translateY(1px)` 的按下效果我保留了，垂直方向有专门的滚动容器管理，而且它不会撑宽。

## 验证

修复后逐项 hover，量了第 2、5、9、13 项，`scrollLeft` 全部是 0，`scrollWidth` 稳定在 224。同时确认纵向滚动没被影响，scrollTop 能滚到底部 436，列表一共 14 个语言。

## 教训

`overflow-y: auto` 不等于只有纵向能滚。只要你不显式写 `overflow-x`，它就可能变成 auto。而任何 transform、box-shadow 的外扩、甚至一个绝对定位的伪元素，都可能悄悄撑大滚动区域。

写一个滚动容器时，养成把两个方向都写清楚的习惯，比事后排查省事得多。
