---
title: Prompt 到底在做什么：改写上下文，而不只是提要求
published: 2026-07-22
category: AI
tags:
  - context
  - prompt
  - attention
  - transformer
  - agent
draft: false
---

system prompt是为了给模型提供更多条件，更多的词元去做概率分布，计算范围更具体化，而思考过程本身是一种预测机制，因为训练的时候是一步一步的进行计算训练，所以ai也学会了一步一步的推到计算，不断构建和更新 Context，从而影响下一步 Token 的预测

<figure class="note-figure" data-pagefind-ignore>
<div class="note-figure-scroll">
<svg viewBox="0 0 720 250" role="img" aria-label="上下文中的 token 经过多层注意力，重新加权下一个 token 的概率分布">
  <defs>
    <marker id="arrow-context" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <text class="fm" x="34" y="32">CONTEXT</text>
  <text class="fm" x="262" y="32">ATTENTION</text>
  <text class="fm" x="516" y="32">NEXT TOKEN</text>
  <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
    <rect x="34" y="54" width="176" height="15" rx="3"/>
    <rect x="34" y="79" width="140" height="15" rx="3"/>
    <rect x="34" y="104" width="164" height="15" rx="3" class="accent"/>
    <rect x="34" y="129" width="120" height="15" rx="3"/>
    <rect x="34" y="154" width="158" height="15" rx="3" class="accent"/>
    <path d="M216 120 H 254" marker-end="url(#arrow-context)"/>
    <rect x="262" y="60" width="186" height="22" rx="4"/>
    <rect x="262" y="100" width="186" height="22" rx="4"/>
    <rect x="262" y="140" width="186" height="22" rx="4"/>
    <path d="M452 120 H 508" marker-end="url(#arrow-context)"/>
    <path class="dashed" d="M512 176 H 700"/>
    <rect x="516" y="158" width="22" height="18" rx="2"/>
    <rect x="548" y="146" width="22" height="30" rx="2"/>
    <rect x="580" y="124" width="22" height="52" rx="2"/>
    <rect x="612" y="80" width="22" height="96" rx="2" class="accent"/>
    <rect x="644" y="142" width="22" height="34" rx="2"/>
    <rect x="676" y="156" width="22" height="20" rx="2"/>
  </g>
  <text class="fs" x="34" y="205">语义 token 组成的上下文</text>
  <text class="fs" x="262" y="205">Hidden State 逐层演化</text>
  <text class="fs" x="516" y="205">下一个 token 的条件概率</text>
</svg>
</div>
<p class="note-figure-hint" aria-hidden="true">横向滑动可看全图</p>
<figcaption>Prompt 不直接指定方向。它往上下文里加 token，这些 token 在多层注意力中持续参与计算，最后改变的是下一个 token 的概率分布。</figcaption>
</figure>

**Prompt 的本质是构造 Context，通过影响模型的 Attention 分布和后续 Token 的条件概率，使模型更容易生成符合预期的输出。**

System Prompt 并不是直接"设定了一个向量方向"，而是通过向 Context 中加入一组具有明确语义的 Token 向量，使它们在 Transformer 的多层 Attention 中持续参与信息交互，从而逐步影响 Hidden State 的演化，最终改变下一 Token 的概率分布。

**Agent本质不断扩充 Context。**

**AI 应用开发，本质上就是设计 Context 的生命周期（Context Lifecycle）**

Prompt负责**改变生成倾向（Generation Preference）**

Structured Output负责**约束生成结构（Structure Constraint）**

Post-processing负责**修正模型输出（Output Correction）**
