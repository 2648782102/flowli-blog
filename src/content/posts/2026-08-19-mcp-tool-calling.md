---
title: Tool Calling 与 MCP：模型怎么用工具，能力怎么被接入
published: 2026-08-19
category: AI
tags:
  - mcp
  - tool-calling
  - protocol
  - agent
draft: false
---

<figure class="note-figure" data-pagefind-ignore>
<div class="note-figure-scroll">
<svg viewBox="0 0 720 248" role="img" aria-label="模型通过 MCP 协议读取统一的工具清单，背后是多个不同的具体实现">
  <defs>
    <marker id="arrow-mcp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
    <rect x="34" y="88" width="126" height="58" rx="4"/>
    <path d="M160 117 H 218" marker-end="url(#arrow-mcp)"/>
    <rect x="222" y="52" width="186" height="132" rx="4" class="accent"/>
    <path d="M222 86 H 408"/>
    <path d="M222 156 H 408"/>
    <path d="M408 100 H 462"/>
    <path d="M408 136 H 462"/>
    <path d="M462 74 H 500 V 68 H 524"/>
    <path d="M462 104 H 500 V 108 H 524"/>
    <path d="M462 128 H 500 V 148 H 524"/>
    <path d="M462 152 H 500 V 188 H 524"/>
    <rect x="528" y="54" width="164" height="28" rx="3"/>
    <rect x="528" y="94" width="164" height="28" rx="3"/>
    <rect x="528" y="134" width="164" height="28" rx="3"/>
    <rect x="528" y="174" width="164" height="28" rx="3"/>
  </g>
  <text class="fm" x="34" y="74">MODEL</text>
  <text class="fs" x="54" y="122">决定调用谁</text>
  <text class="fm" x="222" y="40">MCP SERVER · 统一描述</text>
  <text class="fs" x="238" y="107">name · input schema</text>
  <text class="fs" x="238" y="140">capability list</text>
  <text class="fs" x="238" y="176">统一发现与调用</text>
  <text class="fs" x="544" y="73">文件系统</text>
  <text class="fs" x="544" y="113">浏览器</text>
  <text class="fs" x="544" y="153">数据库</text>
  <text class="fs" x="544" y="193">内部服务</text>
  <text class="fm" x="528" y="226">具体实现 · 可以随时替换</text>
  <text class="fs" x="34" y="176">不关心具体实现</text>
  <text class="fs" x="34" y="196">换模型不影响工具侧</text>
</svg>
</div>
<p class="note-figure-hint" aria-hidden="true">横向滑动可看全图</p>
<figcaption>Tool Calling 解决「模型怎么发起调用」，MCP 解决「能力怎么被发现、描述和接入」。协议在中间，模型与具体实现因此可以各自替换。</figcaption>
</figure>

**MCP Server 是能力提供者（Capability Provider）。**

Tool Calling 解决的是模型如何调用工具，而 MCP 解决的是能力如何被统一发现、描述和调用。它把模型和具体工具实现解耦，使不同模型、不同应用都能通过统一协议访问外部能力，更适合构建可扩展的 Agent 系统。
