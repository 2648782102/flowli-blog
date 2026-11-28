---
title: AI 应用开发，真正做的是上下文设计
published: 2026-07-22
category: AI
tags:
  - context
  - agent
  - application
draft: false
---

<figure class="note-figure" data-pagefind-ignore>
<div class="note-figure-scroll">
<svg viewBox="0 0 720 236" role="img" aria-label="模型固定不动，应用开发围绕上下文的写入、组织、压缩与清理展开">
  <defs>
    <marker id="arrow-app" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
    <rect x="286" y="66" width="148" height="104" rx="5"/>
    <path d="M286 96 H 434"/>
    <rect x="34" y="72" width="140" height="26" rx="3"/>
    <rect x="34" y="112" width="112" height="26" rx="3"/>
    <rect x="34" y="152" width="126" height="26" rx="3"/>
    <path d="M180 124 H 280" marker-end="url(#arrow-app)"/>
    <rect x="546" y="72" width="140" height="26" rx="3" class="accent"/>
    <rect x="546" y="112" width="112" height="26" rx="3"/>
    <rect x="546" y="152" width="126" height="26" rx="3"/>
    <path d="M440 124 H 540" marker-end="url(#arrow-app)"/>
  </g>
  <text class="fm" x="34" y="52">CONTEXT IN</text>
  <text class="fm" x="286" y="52">MODEL · 固定</text>
  <text class="fm" x="546" y="52">OUTPUT</text>
  <text class="fs" x="34" y="200">系统提示 · 检索 · 工具结果 · 历史</text>
  <text class="fs" x="300" y="90">权重不变</text>
  <text class="fs" x="300" y="112">变的是喂进去的东西</text>
  <text class="fs" x="470" y="218">应用层真正的工作量在这里</text>
</svg>
</div>
<p class="note-figure-hint" aria-hidden="true">横向滑动可看全图</p>
<figcaption>模型是常量，上下文是变量。应用开发的工程动作——写入什么、怎么排序、何时压缩、何时丢弃——决定模型看到什么。</figcaption>
</figure>

**AI 应用开发，本质不是开发模型，而是开发 Context。**

**让模型在预测下一个 Token 时，拥有更好的 Context。**
