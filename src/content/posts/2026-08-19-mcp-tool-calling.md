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

**MCP Server 是能力提供者（Capability Provider）。**

Tool Calling 解决的是模型如何调用工具，而 MCP 解决的是能力如何被统一发现、描述和调用。它把模型和具体工具实现解耦，使不同模型、不同应用都能通过统一协议访问外部能力，更适合构建可扩展的 Agent 系统。
