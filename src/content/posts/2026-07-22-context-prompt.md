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

**Prompt 的本质是构造 Context，通过影响模型的 Attention 分布和后续 Token 的条件概率，使模型更容易生成符合预期的输出。**

System Prompt 并不是直接"设定了一个向量方向"，而是通过向 Context 中加入一组具有明确语义的 Token 向量，使它们在 Transformer 的多层 Attention 中持续参与信息交互，从而逐步影响 Hidden State 的演化，最终改变下一 Token 的概率分布。

**Agent本质不断扩充 Context。**

**AI 应用开发，本质上就是设计 Context 的生命周期（Context Lifecycle）**

Prompt负责**改变生成倾向（Generation Preference）**

Structured Output负责**约束生成结构（Structure Constraint）**

Post-processing负责**修正模型输出（Output Correction）**
