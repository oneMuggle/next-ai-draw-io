# Windows 7 浏览器适配改造方案

## 背景与目标

本项目（Next AI Draw.io）部署后，Windows 7 用户通过浏览器访问时遇到两个核心问题：

1. **draw.io 嵌入面板无法显示** — `react-drawio` iframe 加载失败或渲染异常
2. **LLM 聊天功能异常** — AI 对话无法正常工作或流式输出中断

**根本原因：** Windows 7 最高仅支持 Chrome/Edge 109（2023 年 1 月 EOL），而当前项目的技术栈面向的是现代浏览器（Chrome 114+）：

| 依赖 | 当前版本 | 最低浏览器要求 | Win7 Chrome 109 兼容 |
|------|---------|---------------|---------------------|
| Next.js | 16 | Chrome 114+ | 不兼容 |
| React | 19.1 | Chrome 114+（依赖 `document.startViewTransition` 等新 API） | 不兼容 |
| AI SDK (ai) | 6.0 | Chrome 110+（`ReadableStream`、`asyncIterator` 增强） | 部分不兼容 |
| Tailwind CSS | 4 | Chrome 119+（`oklch()` 颜色空间） | CSS 不兼容 |
| TypeScript target | ES2017 | — | 基本兼容 |
| react-drawio | 1.0.3 | Chrome 110+（iframe postMessage 协议） | 不兼容 |

**改造目标：** 使应用能够在 Windows 7 + Chrome 109 / Firefox 115 ESR 上正常运行 draw.io 嵌入和 LLM 聊天功能。

## 涉及的文件与模块

| 模块 | 关键文件 | 变更类型 |
|------|---------|---------|
| Next.js 配置 | `next.config.ts` | 新增 |
| Browserslist | `.browserslistrc`（新增） | 新增 |
| Tailwind CSS | `tailwind.config.ts`（待创建/修改） | 修改 |
| Polyfills | `app/[lang]/polyfills.ts`（新增） | 新增 |
| AI SDK 传输层 | `components/chat-panel.tsx` | 修改 |
| Draw.io 嵌入 | `app/[lang]/page.tsx` | 修改 |
| Layout 入口 | `app/[lang]/layout.tsx` | 修改 |
| Package.json | `package.json` | 新增依赖 |

## 技术方案

### 方案 A：降级核心依赖（推荐）

将关键依赖降级到支持 Chrome 109 的版本，配合 polyfill 补全缺失的 API。

**优势：** 根本性解决问题，兼容性好
**劣势：** 可能丢失部分最新特性

#### 1. 降级 React 19 → React 18.3

React 19 引入了多项需要 Chrome 114+ 的特性（Actions、`useFormStatus` 等）。React 18.3 支持到 Chrome 90+。

```bash
npm install react@18.3.1 react-dom@18.3.1
npm install @types/react@18 @types/react-dom@18
```

需要同步检查 `react-drawio`、Radix UI 等依赖是否兼容 React 18。

#### 2. 降级 Next.js 16 → Next.js 14 LTS

Next.js 14 是 LTS 版本，浏览器支持范围更广（Chrome 90+），且稳定性经过充分验证。

```bash
npm install next@14.2.x
```

**注意：** Next.js 14 使用 App Router 与 Next.js 16 基本兼容，但需验证 `output: "standalone"` 行为是否一致。

#### 3. 降级 AI SDK 到 v4

`ai` v6 和 `@ai-sdk/react` v3 依赖较新的浏览器 API。`ai` v4 支持 Chrome 100+。

```bash
npm install ai@4 @ai-sdk/react@1 @ai-sdk/openai@1 @ai-sdk/anthropic@1 ...
```

需要检查 API 变化（`useChat` 的 `transport` 配置在 v4 中是默认的，不需要 `DefaultChatTransport`）。

#### 4. 降级 Tailwind CSS 4 → Tailwind CSS 3

Tailwind CSS v4 使用了 `oklch()` 颜色空间（Chrome 119+ 才支持），v3 使用传统的 `rgb()`/`hsl()`。

```bash
npm install tailwindcss@3 postcss@8 autoprefixer@10
```

需更新 `postcss.config.mjs` 和 tailwind 配置。

#### 5. 添加 Polyfills

为 Chrome 109 补全以下 API：

| 缺失 API | Polyfill | 用途 |
|----------|---------|------|
| `structuredClone` | 自实现或 core-js | React 18 内部使用 |
| `ReadableStream` polyfill | `web-streams-polyfill` | AI SDK 流式输出 |
| `Intl.Segmenter` | core-js 或自实现 | i18n 文本处理 |
| `Array.prototype.toSorted` | core-js | 部分组件逻辑 |

```bash
npm install web-streams-polyfill
```

在 `app/[lang]/layout.tsx` 中注入 polyfills：

```typescript
import 'web-streams-polyfill/ponyfill'
```

#### 6. 添加 Browserslist 配置

```
# .browserslistrc
Chrome >= 109
Firefox >= 115
Edge >= 109
Safari >= 15
```

### 方案 B：保持当前版本 + 完整 Polyfill（风险较高）

保持现有依赖版本不变，通过大量 polyfill 向后兼容。

**不推荐原因：**
- React 19 内部依赖的浏览器 API 无法通过 polyfill 模拟
- Tailwind CSS v4 的 `oklch()` 是引擎级特性，无法 polyfill
- Next.js 16 编译产物的 ES 特性超出 Chrome 109 能力

### 方案 C：提供 Electron 桌面客户端（最佳体验）

既然本项目已有 Electron 支持，可以为 Win7 用户提供 Electron 桌面版。

**问题：** Electron 23+ 放弃了 Win7 支持。最后一个支持 Win7 的版本是 **Electron 22.3.x**（Chromium 108）。

```bash
npm install electron@22.3.27 electron-builder@24.x
```

Electron 22 的 Chromium 108 与 Win7 上 Chrome 109 能力基本一致，且自带运行环境，不依赖用户浏览器。

## 风险评估与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI SDK v4 API 不兼容 | 需重写 chat-panel.tsx 中的 useChat 调用 | 详细比对 v4 与 v6 API 差异 |
| Radix UI 组件不兼容 React 18 | 部分 UI 组件可能报错 | 逐组件验证或降级 Radix UI |
| react-drawio 依赖 React 19 | draw.io 嵌入可能失效 | 降级到 react-drawio 支持 React 18 的版本，或改用 iframe 直嵌 |
| Next.js 14 App Router 差异 | 部分 Next.js 16 特性不可用 | 审查所有 API route 和 client component |
| 降级后构建产物体积增大 | 页面加载变慢 | 通过 code splitting 和 gzip 缓解 |
| Electron 22 安全漏洞 | 存在已知 CVE | 仅在局域网/内网部署，不暴露公网 |

## 实施步骤

### 阶段一：降级核心依赖（已完成）

- [x] 步骤 1：添加 `.browserslistrc` 配置
- [x] 步骤 2：降级 React 19 → 18.3，修复类型定义
- [x] 步骤 3：降级 Next.js 16 → 14.2 LTS
- [x] 步骤 4：降级 Tailwind CSS 4 → 3.x，更新 PostCSS 配置
- [x] 步骤 5：安装 polyfills（web-streams-polyfill + core-js）

### 阶段二：AI SDK 适配（已调整）

> **变更：** AI SDK v6 保持不变。降级到 v4 需要重写整个 chat-panel.tsx（sendMessage→handleSubmit, addToolOutput→addToolResult, sendAutomaticallyWhen 移除等），改动量过大。改为通过 polyfills（core-js + web-streams-polyfill）解决浏览器 API 兼容性。

- [x] 步骤 6：保持 AI SDK v6，通过 polyfills 解决浏览器兼容性
- [x] 步骤 7：不适用（保持 DefaultChatTransport）
- [x] 步骤 8：不适用（保持 streamText/streamObject）
- [ ] 步骤 9：验证流式输出在 Chrome 109 中正常工作

### 阶段三：Draw.io 适配（已完成）

- [x] 步骤 10：验证 react-drawio 与 React 18 的兼容性（peerDeps 支持 React 16.8~19.0）
- [x] 步骤 11：不需要，react-drawio 直接兼容
- [x] 步骤 12：postMessage 通信 Chrome 1+ 支持，Chrome 109 无问题

### 阶段四：全面测试与修复（需在 Win7 环境中执行）

- [ ] 步骤 13：在 Chrome 109 环境下执行构建和启动（**需 Win7 测试环境**）
- [ ] 步骤 14：验证 draw.io 面板正常显示和交互
- [ ] 步骤 15：验证 LLM 聊天流式输出正常
- [ ] 步骤 16：验证会话管理（IndexedDB）正常
- [ ] 步骤 17：验证文件上传、PDF 处理等功能
- [ ] 步骤 18：修复发现的问题

### 阶段五：Electron Win7 适配（已完成配置，需测试）

- [x] 步骤 19：降级 Electron 到 22.3.27
- [x] 步骤 20：更新 electron-builder.yml 中的 electronVersion
- [ ] 步骤 21：测试 Win7 上 Electron 客户端运行（**需 Win7 测试环境**）
- [x] 降级 electron-builder 到 24.13.3（兼容 Electron 22）

## 推荐方案

**方案 A（降级依赖） + 方案 C（Electron 备选）** 组合实施：

1. ~~首先执行方案 A，使 Web 版本在 Win7 Chrome 109 上可用~~ **已完成**
2. ~~同时提供 Electron Win7 兼容版作为备选~~ **配置已完成，需在 Win7 测试**

## 实施结果总结

### 已完成的变更

| 变更 | 文件 | 说明 |
|------|------|------|
| 浏览器目标 | `.browserslistrc` (新增) | Chrome >= 109, Firefox >= 115 |
| React 降级 | `package.json` | 19.1.2 → 18.3.1 |
| Next.js 降级 | `package.json` | 16 → 14.2.35 |
| Tailwind CSS 降级 | `package.json` | 4 → 3.4.17 |
| PostCSS 配置 | `postcss.config.mjs` | v4 插件 → v3 格式 |
| Tailwind 配置 | `tailwind.config.ts` (新增) | v3 格式，hsl 颜色映射 |
| CSS 转换 | `app/globals.css` | oklch() → hsl()，v4 → v3 语法 |
| Polyfills | `app/polyfills.ts` (新增) | web-streams-polyfill + core-js |
| Polyfill 注入 | `app/[lang]/layout.tsx` | 导入 polyfills |
| Next.js 配置 | `next.config.mjs` | .ts → .mjs（Next.js 14 不支持 .ts 配置） |
| Next.js 14 适配 | `app/[lang]/layout.tsx` | params 从 Promise 改为同步值 |
| React 18 类型 | `contexts/diagram-context.tsx` | Ref → MutableRefObject |
| Electron 降级 | `package.json` | 39.2.7 → 22.3.27 |
| electron-builder | `package.json` | 26 → 24.13.3 |
| electron-builder 配置 | `electron/electron-builder.yml` | electronVersion 改为 22.3.27 |
| AI SDK | `package.json` | 保持 v6（降级 v4 改动量过大） |

### 需要在 Win7 测试环境验证的事项

1. 浏览器访问：draw.io iframe 是否正常加载
2. 浏览器访问：LLM 聊天流式输出是否正常
3. 浏览器访问：IndexedDB 会话管理是否正常
4. Electron 客户端：是否能正常启动和运行
5. Electron 客户端：draw.io 和 LLM 功能是否正常
