# Aire Library

我们的共读图书馆。

## 方向

Aire Library 不是单独的“电子书阅读器”，目标是让隐和 Aire 围绕同一份阅读状态共读：

- Project Gutenberg 负责公版书源。
- GitHub Pages 负责轻量前端。
- Supabase 负责 Gutenberg MCP 代理，以及后续的阅读进度、划线与共读状态。
- ChatGPT / Aire 可以读取 Supabase 中的共同阅读状态，在对话里继续讨论。

## 当前阶段

v0.1 骨架：

- 搜索 Gutenberg 书目
- 打开并分块阅读正文
- 记住当前设备上的阅读位置
- 为后续“共享进度 / 划线共读”预留数据接口

> 仓库目前为 private。GitHub Free 的 Pages 只支持 public repository；如果账号没有 GitHub Pro，发布时需要再决定是否公开仓库。

## 数据来源

Book catalog and text are provided through [cyanheads/gutenberg-mcp-server](https://github.com/cyanheads/gutenberg-mcp-server), backed by Project Gutenberg public-domain works.
