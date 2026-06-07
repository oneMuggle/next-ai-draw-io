# Next AI Draw.io 技术手册

> 版本：v0.4.13 | 最后更新：2026-05-25

## 目录

1. [系统架构](#系统架构)
2. [完整环境变量参考](#完整环境变量参考)
3. [AI 供应商配置详解](#ai-供应商配置详解)
4. [API 路由文档](#api-路由文档)
5. [服务端模型配置](#服务端模型配置)
6. [DynamoDB 配额系统](#dynamodb-配额系统)
7. [Langfuse 可观测性](#langfuse-可观测性)
8. [Docker 构建与部署](#docker-构建与部署)
9. [Docker Compose 离线部署](#docker-compose-离线部署)
10. [Cloudflare Workers 部署](#cloudflare-workers-部署)
11. [Electron 桌面应用打包](#electron-桌面应用打包)
12. [Windows 7 兼容性说明](#windows-7-兼容性说明)

---

## 系统架构

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 14.2 LTS |
| UI 库 | React | 18.3 |
| 样式 | Tailwind CSS | 3.4 |
| AI SDK | Vercel AI SDK (ai) | 6.0 |
| 图表引擎 | react-drawio | 1.0 |
| 桌面端 | Electron | 22.3 |
| 构建工具 | Turbopack（开发） | - |
| 代码检查 | Biome | 2.4 |
| 测试 | Vitest + Playwright | - |

### 项目结构

```
next-ai-draw-io/
├── app/                    # Next.js App Router
│   ├── [lang]/            # 国际化路由
│   │   ├── layout.tsx     # 语言布局
│   │   └── page.tsx       # 主页面
│   ├── api/               # API Routes
│   │   └── chat/          # 聊天流式响应 API
│   ├── globals.css        # 全局样式
│   └── polyfills.ts       # 浏览器兼容性 polyfills
├── components/            # React 组件
│   ├── chat-panel.tsx     # 聊天面板（核心组件）
│   └── ...
├── contexts/              # React Contexts
│   └── diagram-context.tsx  # 图表状态管理
├── lib/                   # 工具函数和业务逻辑
├── electron/              # Electron 主进程/预加载脚本
├── docs/                  # 文档
│   ├── plans/             # 计划文档（实施中）
│   ├── technical/         # 技术文档（已归档）
│   └── user-manual/       # 用户手册
├── Dockerfile             # 多阶段 Docker 构建
├── docker-compose.yml     # Docker Compose 配置
├── next.config.mjs        # Next.js 配置
├── tailwind.config.ts     # Tailwind CSS 配置
└── package.json
```

### 数据流

```
用户输入 → 聊天面板 → /api/chat → AI SDK → AI 供应商 → 流式响应 → XML 解析 → draw.io 渲染
```

---

## 完整环境变量参考

### 核心配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `AI_PROVIDER` | 否 | `bedrock` | AI 供应商：bedrock, openai, anthropic, google, vertexai, azure, ollama, openrouter, deepseek, siliconflow, gateway, glm, qwen, kimi, minimax, qiniu, modelscope, sglang, doubao |
| `AI_MODEL` | 是 | - | 模型 ID，必须与所选供应商匹配 |
| `TEMPERATURE` | 否 | 模型默认 | 控制随机性（0-1），不支持温度的模型（如 GPT-5.1 推理模型）请留空 |
| `ACCESS_CODE_LIST` | 否 | - | 访问码列表，逗号分隔 |

### Draw.io 与部署

| 变量名 | 构建时 | 默认值 | 说明 |
|--------|--------|--------|------|
| `NEXT_PUBLIC_DRAWIO_BASE_URL` | 是 | `https://embed.diagrams.net` | draw.io 嵌入地址，**构建时变量**，修改需重新构建 |
| `NEXT_PUBLIC_BASE_PATH` | 是 | `""` | 子目录部署路径，如 `/nextaidrawio` |
| `NEXT_PUBLIC_SHOW_ABOUT_AND_NOTICE` | 是 | `false` | 是否显示"关于"链接和通知图标 |
| `NEXT_PUBLIC_SELFHOSTED` | 是 | `""` | 自部署标识，设为 `true` 时配额弹窗中隐藏赞助/自部署链接 |

### 功能开关

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_PDF_INPUT` | `true` | 启用 PDF/文本文件上传功能 |
| `NEXT_PUBLIC_MAX_EXTRACTED_CHARS` | `150000` | PDF/文本提取的最大字符数 |
| `ALLOW_PRIVATE_URLS` | `true` | 允许私有/内网 URL（反向代理场景），设为 `false` 阻止 localhost 和内网地址 |

---

## AI 供应商配置详解

### AWS Bedrock

```bash
AI_PROVIDER=bedrock
AI_MODEL=global.anthropic.claude-sonnet-4-5-20250929-v1:0
# AWS 凭证（可选，使用 IAM 角色时可省略）
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
# Claude 推理预算（1024-64000 tokens）
BEDROCK_REASONING_BUDGET_TOKENS=12000
# Nova 推理努力（low/medium/high）
BEDROCK_REASONING_EFFORT=medium
```

### OpenAI

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # 可选：自定义端点
OPENAI_ORGANIZATION=org-...  # 可选
OPENAI_PROJECT=proj_...      # 可选
# o1/o3/gpt-5 模型推理配置
OPENAI_REASONING_EFFORT=low        # 推理努力（minimal/low/medium/high）
OPENAI_REASONING_SUMMARY=detailed  # 推理摘要（none/brief/detailed）
```

### Anthropic（直连）

```bash
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://your-custom-anthropic/v1  # 可选
# 扩展思考
ANTHROPIC_THinking_TYPE=enabled
ANTHROPIC_THINKING_BUDGET_TOKENS=12000
```

### Google AI (Gemini)

```bash
AI_PROVIDER=google
AI_MODEL=gemini-2.5-pro
GOOGLE_GENERATIVE_AI_API_KEY=...
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta  # 可选
GOOGLE_CANDIDATE_COUNT=1   # 可选：候选数量
GOOGLE_TOP_K=40            # 可选：Top K 采样
GOOGLE_TOP_P=0.95          # 可选：Nucleus 采样
# Gemini 2.5 思考预算（1024-100000）
GOOGLE_THINKING_BUDGET=8192
# Gemini 3 思考级别（low/high）
GOOGLE_THINKING_LEVEL=high
```

### Google Vertex AI（企业 GCP）

```bash
AI_PROVIDER=vertexai
AI_MODEL=gemini-2.5-pro
GOOGLE_VERTEX_API_KEY=                          # 必需：Express Mode API key
GOOGLE_VERTEX_BASE_URL=https://...              # 可选：自定义端点
GOOGLE_VERTEX_THINKING_BUDGET=8192              # Gemini 2.5 思考预算
GOOGLE_VERTEX_THINKING_LEVEL=high               # Gemini 3 思考级别
```

### Azure OpenAI

```bash
AI_PROVIDER=azure
AI_MODEL=gpt-4o
# 二选一配置端点方式：
AZURE_RESOURCE_NAME=your-resource-name
# 或
AZURE_BASE_URL=https://your-resource.openai.azure.com/openai
AZURE_API_KEY=...
AZURE_REASONING_EFFORT=low
AZURE_REASONING_SUMMARY=detailed
```

### Ollama

```bash
AI_PROVIDER=ollama
AI_MODEL=llama3.1
OLLAMA_BASE_URL=https://ollama.com/api  # 可选，默认 Ollama Cloud
OLLAMA_API_KEY=your-ollama-cloud-api-key  # 可选
OLLAMA_ENABLE_THINKING=true  # 可选：启用 thinking（qwen3 等模型）
```

### OpenRouter

```bash
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-sonnet-4-5
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # 可选
```

### DeepSeek

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### SiliconFlow（硅基流动）

```bash
AI_PROVIDER=siliconflow
AI_MODEL=...
SILICONFLOW_API_KEY=sk-...
SILICONFLOW_BASE_URL=https://api.siliconflow.com/v1  # 或 .cn
```

### 智谱 GLM

```bash
AI_PROVIDER=glm
AI_MODEL=cogview-4  # 或其他 GLM 模型
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### 通义千问 Qwen

```bash
AI_PROVIDER=qwen
AI_MODEL=qwen-max
QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### Kimi（月之暗面）

```bash
AI_PROVIDER=kimi
AI_MODEL=moonshot-v1-8k
KIMI_API_KEY=your_kimi_api_key
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

### MiniMax

```bash
AI_PROVIDER=minimax
AI_MODEL=...
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic
```

### 七牛云

```bash
AI_PROVIDER=qiniu
AI_MODEL=...
QINIU_API_KEY=your_qiniu_api_key
QINIU_BASE_URL=https://api.qnaigc.com/v1
```

### ByteDance Doubao（火山引擎）

```bash
AI_PROVIDER=doubao
AI_MODEL=...
DOUBAO_API_KEY=your-doubao-api-key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

### Vercel AI Gateway

```bash
AI_PROVIDER=gateway
AI_MODEL=openai/gpt-4o  # 格式："provider/model"
AI_GATEWAY_API_KEY=...
AI_GATEWAY_BASE_URL=https://your-custom-gateway.com/v1/ai  # 可选
```

### ModelScope

```bash
AI_PROVIDER=modelscope
AI_MODEL=...
MODELSCOPE_API_KEY=ms-...
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
```

### SGLang

```bash
AI_PROVIDER=sglang
AI_MODEL=...
SGLANG_API_KEY=your-sglang-api-key
SGLANG_BASE_URL=http://127.0.0.1:8000/v1
```

---

## API 路由文档

### POST /api/chat

流式聊天端点，处理用户对话请求并生成 draw.io XML 响应。

**请求体：**
```typescript
{
  messages: Message[];      // 对话历史
  model?: string;           // 模型 ID
  provider?: string;        // 供应商
  systemPrompt?: string;    // 自定义系统提示
  // ... Vercel AI SDK 标准参数
}
```

**响应：** 流式文本响应（Server-Sent Events），包含 draw.io XML 格式的图表数据。

**特性：**
- 自动检测模型能力并启用 extended thinking / reasoning
- 支持图片输入（base64 编码）
- 支持多轮对话上下文
- 集成 Langfuse 追踪（如果配置）

### 其他 API

项目中可能还有其他 API 路由（如配额管理、文件上传处理等），请参考源代码 `app/api/` 目录。

---

## 服务端模型配置

管理员可配置服务端多模型，使所有用户无需个人 API Key 即可使用。

### 配置方式

通过 `AI_MODELS_CONFIG_PATH` 环境变量指定 JSON 配置文件路径，默认为项目根目录的 `ai-models.json`。

### JSON 格式示例

```json
{
  "models": [
    {
      "id": "claude-sonnet-4-5",
      "name": "Claude Sonnet 4.5",
      "provider": "anthropic",
      "description": "最佳 draw.io 支持模型",
      "isDefault": true
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "provider": "openai",
      "description": "快速响应"
    }
  ]
}
```

用户在界面中可以看到可用的模型列表并切换，无需输入 API Key。

---

## DynamoDB 配额系统

项目支持基于 DynamoDB 的服务端配额管理。

### 功能

- 每日请求次数限制
- Token 消耗量限制
- 每分钟请求数（TPM）限制
- 用户级别的配额跟踪

### 启用方式

1. 创建 DynamoDB 表
2. 配置 AWS 凭证
3. 启用配额管理中间件

具体实现请参考 `lib/` 目录下的配额相关代码。

---

## Langfuse 可观测性

项目集成了 Langfuse OpenTelemetry 追踪。

### 配置

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com  # EU 区域
# 或使用美国区域：https://us.cloud.langfuse.com
```

### 功能

- LLM 调用追踪
- Token 消耗统计
- 延迟和性能指标
- 错误率监控
- 在 Langfuse 仪表板中查看详细分析

---

## Docker 构建与部署

### 构建镜像

```bash
# 标准构建
docker build -t next-ai-drawio .

# 使用国内 npm 镜像加速
docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t next-ai-drawio .

# 自托管 draw.io 构建
docker build \
  --build-arg NEXT_PUBLIC_DRAWIO_BASE_URL=http://your-server:8080 \
  -t next-ai-drawio .

# 子目录部署构建
docker build \
  --build-arg NEXT_PUBLIC_BASE_PATH=/nextaidrawio \
  -t next-ai-drawio .
```

### 构建阶段说明

Dockerfile 使用三阶段构建：

1. **deps 阶段**：安装 npm 依赖（使用 `--legacy-peer-deps` 解决依赖冲突）
2. **builder 阶段**：构建 Next.js 应用（standalone 模式输出）
3. **runner 阶段**：生产环境运行（非 root 用户 `nextjs`）

### 运行容器

```bash
docker run -d -p 3000:3000 \
  -e AI_PROVIDER=openai \
  -e AI_MODEL=gpt-4o \
  -e OPENAI_API_KEY=your_api_key \
  next-ai-drawio
```

### 挂载配置文件

```bash
# 挂载 ai-models.json
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=your_api_key \
  -v $(pwd)/ai-models.json:/app/ai-models.json:ro \
  next-ai-drawio

# 自定义配置路径
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=your_api_key \
  -e AI_MODELS_CONFIG_PATH=/config/ai-models.json \
  -v $(pwd)/ai-models.json:/config/ai-models.json:ro \
  next-ai-drawio
```

### 镜像优化

- 使用 Alpine 基础镜像减小体积
- standalone 输出仅包含必要的文件
- 非 root 用户运行提高安全性

---

## Docker Compose 离线部署

### 完整离线方案

如果 `embed.diagrams.net` 被墙或需要完全离线使用，可以自托管 draw.io。

**docker-compose.yml：**

```yaml
services:
  drawio:
    image: jgraph/drawio:latest
    ports: ["8080:8080"]
  next-ai-draw-io:
    build:
      context: .
      args:
        - NEXT_PUBLIC_DRAWIO_BASE_URL=http://localhost:8080
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [drawio]
```

**启动：**

```bash
docker compose up -d
```

访问 `http://localhost:3000`。

### 关键警告

`NEXT_PUBLIC_DRAWIO_BASE_URL` 的值必须能从**用户浏览器**访问到。

| 场景 | URL 值 |
|------|--------|
| 本地使用 | `http://localhost:8080` |
| 远程/服务器 | `http://YOUR_SERVER_IP:8080` |

**切勿使用** Docker 内部别名如 `http://drawio:8080`，浏览器无法解析。

### 预下载镜像

完全离线环境需提前下载镜像：

```bash
docker pull node:24-alpine
docker pull jgraph/drawio:latest
docker build -t next-ai-drawio .
```

---

## Cloudflare Workers 部署

### 部署步骤

```bash
# 1. 构建
npm run deploy

# 或手动部署
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

### 配置

确保在 Cloudflare 仪表板中配置环境变量，与 `.env.local` 保持一致。

详细步骤请参考 `docs/en/cloudflare-deploy.md`。

---

## Electron 桌面应用打包

### 构建命令

```bash
# 打包所有平台
npm run dist:all

# 仅 macOS
npm run dist:mac

# 仅 Windows
npm run dist:win

# 仅 Linux
npm run dist:linux

# Windows 构建（不使用自动发布）
npm run dist:win:build
```

### 构建流程

1. `npm run electron:build` — 构建 Next.js 应用 + esbuild 打包 Electron 代码
2. `npm run electron:prepare` — 准备 Electron 构建输出
3. `npx electron-builder` — 使用 electron-builder 打包为目标平台安装包

### electron-builder 配置

配置文件位于 `electron/electron-builder.yml`，当前使用 Electron 22.3.27（最后支持 Windows 7 的版本）。

### 输出产物

- **Windows**：NSIS 安装程序 `.exe`
- **macOS**：DMG 镜像 `.dmg` + ZIP
- **Linux**：AppImage、deb、rpm

---

## Windows 7 兼容性说明

### 已适配内容

| 适配项 | 方案 |
|--------|------|
| Electron 版本 | 降级至 22.3（Chromium 108，最后支持 Win7 的版本） |
| React 版本 | 降级至 18.3（React 19 不支持旧浏览器） |
| Next.js 版本 | 降级至 14.2 LTS |
| Tailwind CSS | 降级至 3.4（v4 使用 oklch 颜色，Chrome 109 不支持） |
| 浏览器 Polyfills | 引入 `core-js`（structuredClone、Array.toSorted、Intl.Segmenter）和 `web-streams-polyfill`（AI SDK 流式） |
| CSS 颜色 | 所有 oklch() 已降级为 hsl() |
| 配置格式 | Next.js 配置从 .ts 改为 .mjs（v14 不支持 TypeScript 配置） |
| 构建产物审计 | `scripts/audit-build-compat.mjs` 扫描 `.next/static/` 残留的 ES2023+ / Chrome 110+ 特性 |
| Playwright 通道 | `chromium-109` 项目使用系统 Chrome + Win7 UA 模拟真实 Win7 加载 |
| 烟雾 E2E | `tests/e2e/win7-compat.spec.ts` 三组断言：polyfill 注入 / CSS 变量 / 无致命错误 |

### 推荐浏览器

- Chrome 109（Win7 最后一个 Chrome 版本，2023 年 1 月 EOL）
- Firefox 115+（ESR 版本）
- Edge 109

### 已知限制

- AI SDK v6 保留了较新的 API 特性，通过 polyfill 在 Chrome 109 中模拟
- 部分最新 AI 模型可能要求较新的浏览器 TLS 支持
- draw.io 嵌入在极旧浏览器中可能有轻微渲染差异
- Playwright 的 `chromium-109` 通道依赖系统安装的 Chrome（CI 环境若无 Chrome 109，spec 内部 `test.skip()` 兜底）

### 构建产物审计

`scripts/audit-build-compat.mjs` 在 `npm run build` 之后扫描 `.next/static/chunks/` 与 `.next/static/css/`，检查以下规则：

| 类别 | 命中规则 | 触发条件 | 替代方案 |
|------|----------|----------|----------|
| JS | `Array.prototype.{toSorted,toReversed,toSpliced,with}` | minChrome 110+ | core-js 已提供 |
| JS | `Object.groupBy` / `Map.groupBy` | minChrome 117+ | core-js 已提供 |
| JS | `Promise.withResolvers` | minChrome 119+ | 库自带 void 0 === 检查时自动跳过 |
| JS | `ArrayBuffer.prototype.transfer/resize` | minChrome 111+ | core-js 已提供 |
| JS | `String.prototype.{isWellFormed,toWellFormed}` | minChrome 114+ | 需手动 polyfill |
| CSS | `oklch(` / `oklab(` | minChrome 111+ | 替换为 `hsl()` |
| CSS | `color-mix(` | minChrome 111+ | 改用预计算 |
| CSS | `color(srgb/...)` | minChrome 111+ | 替换为 `hsl()` |
| CSS | `:has(` / `@container` | minChrome 105+ | target=109 已支持，不报警 |

**用法：**

```bash
# 软提示（CI 默认）：打印报告，命中不退出
npm run compat:audit

# 严格模式：命中即 exit(1)
npm run compat:audit:strict
```

**已知误报处理：** `Promise.withResolvers` 在 PDF.js chunk 中以 `void 0 === Promise.withResolvers && (Promise.withResolvers = ...)` 形式自带 defensive polyfill，脚本会识别并跳过该文件。

### Win7 烟雾 E2E

`tests/e2e/win7-compat.spec.ts` 提供三组核心断言：

1. **polyfills are loaded** — 检测 `window.structuredClone`、`ReadableStream`、`Intl.Segmenter`、`Array.prototype.toSorted` 是否可用
2. **CSS variables are resolved (--background)** — 验证 `globals.css` 关键变量在该浏览器下能解析
3. **draw.io iframe loads without page errors** — 端到端验证嵌入链路

**双通道设计**（适配无 Chrome 109 环境的现实）：

- **默认 `chromium` 通道**（永远可用）：跑全部三组断言。polyfill 注入和 CSS 变量解析与浏览器版本无关，任意现代浏览器都能验证，覆盖 80% 兼容性风险。
- **`chromium-109` 通道**（需系统安装 Chrome 109）：跑同一组断言，叠加 Win7 UA 模拟真实 Win7 加载。环境缺失时 spec 内部 `test.skip()` 兜底，不阻塞主流程。

**运行：**

```bash
# 跑全部通道（默认 chromium 必跑，chromium-109 若无 Chrome 109 自动 skip）
npm run test:e2e

# 仅跑默认 chromium 通道（无系统 Chrome 109 时用这个）
npx playwright test --project=chromium

# 仅跑 Win7 通道（需先在系统中安装 Chrome 109）
npx playwright test --project=chromium-109
```

### 升级依赖前必跑

```bash
npm run build
npm run compat:audit:strict   # 任何命中都需修复或补充 polyfill
npm run test:e2e              # 默认 chromium 通道 + Win7 通道都需通过
```

### 测试待办

- [x] Win7 Chrome 109 烟雾 E2E（polyfill / CSS / iframe）
- [x] 构建产物兼容性自动审计脚本
- [ ] Win7 物理机 / 虚拟机人工回归（draw.io、LLM 流式、IndexedDB、文件上传）
- [ ] Electron 22 桌面应用在 Win7 上的端到端验证
- [ ] 验证图片上传和识别功能