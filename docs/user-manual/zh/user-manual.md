# Next AI Draw.io 用户手册

> 版本：v0.4.13 | 最后更新：2026-05-25

## 目录

1. [产品概述](#产品概述)
2. [快速开始](#快速开始)
3. [界面说明](#界面说明)
4. [AI 图表生成](#ai-图表生成)
5. [模型选择与配置](#模型选择与配置)
6. [文件操作](#文件操作)
7. [会话管理](#会话管理)
8. [设置](#设置)
9. [Electron 桌面版](#electron-桌面版)
10. [常见问题](#常见问题)

---

## 产品概述

Next AI Draw.io 是一款基于 Next.js 开发的 AI 驱动图表创建工具，支持通过自然语言对话创建和编辑 draw.io 图表。

**核心功能：**
- **AI 图表生成**：通过自然语言描述创建流程图、架构图、网络拓扑图等
- **图片识别生成**：上传现有图表图片，AI 自动识别并重建
- **PDF/文本导入**：从 PDF 文档或文本文件中提取内容并生成图表
- **AI 推理展示**：支持显示 AI 的思考过程（适用于 Claude、Gemini、GPT-5 等模型）
- **图表历史版本**：记录所有变更，可随时回退到之前的版本
- **交互式对话界面**：通过持续对话实时优化图表
- **云架构图支持**：原生支持 AWS、GCP、Azure 云架构图标
- **动画连接线**：创建动态连接线以增强可视化效果

**支持的 AI 供应商（21+）：**
AWS Bedrock、OpenAI、Anthropic、Google AI、Google Vertex AI、Azure OpenAI、Ollama、OpenRouter、DeepSeek、SiliconFlow、ModelScope、SGLang、Vercel AI Gateway、ByteDance Doubao、GLM（智谱）、Qwen（通义千问）、Kimi（月之暗面）、MiniMax、七牛云等。

---

## 快速开始

### 方式一：在线体验

访问演示站点：[https://next-ai-drawio.jiang.jp/](https://next-ai-drawio.jiang.jp/)

> 演示站点由字节跳动豆包赞助支持。您可以配置自己的 API Key 来绕过使用限制。

### 方式二：Docker 运行

```bash
docker run -d -p 3000:3000 \
  -e AI_PROVIDER=openai \
  -e AI_MODEL=gpt-4o \
  -e OPENAI_API_KEY=your_api_key \
  ghcr.io/dayuanjiang/next-ai-draw-io:latest
```

然后访问 `http://localhost:3000`。

### 方式三：本地开发

```bash
git clone https://github.com/DayuanJiang/next-ai-draw-io
cd next-ai-draw-io
npm install
cp .env .env.local
# 编辑 .env.local 填入你的 AI 供应商配置
npm run dev
```

访问 `http://localhost:6002`。

### 方式四：下载桌面应用

前往 [Releases 页面](https://github.com/DayuanJiang/next-ai-draw-io/releases) 下载对应平台的安装包。

支持平台：Windows、macOS、Linux。

---

## 界面说明

界面主要由以下区域组成：

- **左侧对话面板**：与 AI 进行对话，输入自然语言描述你的图表需求
- **右侧画布区域**：draw.io 图表编辑和渲染区域
- **顶部工具栏**：模型选择、文件导入/导出、设置等操作
- **底部输入区**：文本输入框、文件上传按钮、发送按钮

---

## AI 图表生成

### 创建新图表

1. 在对话输入框中输入你的需求描述
2. 点击发送按钮（或按 Enter）
3. AI 会自动生成图表 XML 并在画布中渲染

**示例提示词：**
- "画一个用户登录流程图"
- "生成一个 GCP 架构图，包含负载均衡、Compute Engine 和 Cloud SQL"
- "用 AWS 图标画一个三层 Web 应用架构"
- "画一个可爱的猫咪简笔画"

### 修改现有图表

1. 在已有图表的基础上，继续输入修改指令
2. 例如："把数据库改成 MySQL 图标"、"添加一个缓存层"

### 上传文件生成图表

**支持的上传类型：**
- **图片**（PNG、JPG、SVG）：AI 会尝试识别图片中的图表结构并重建
- **PDF 文档**：提取文本内容后生成图表（默认最多提取 150,000 字符）
- **文本文件**：直接从文本内容生成图表

上传方式：点击输入框旁的上传按钮，选择文件。

### AI 推理展示

当使用支持推理展示的模型（如 OpenAI o1/o3/GPT-5、Claude、Gemini 2.5/3）时，AI 的思考过程会显示在回复中，帮助你理解 AI 是如何构建图表的。

---

## 模型选择与配置

### 在界面中配置

1. 点击聊天面板右上角的 **设置图标**
2. 选择你的 AI 供应商
3. 填入对应的 API Key
4. 保存设置

> 配置信息存储在浏览器本地存储（IndexedDB/LocalStorage）中，不会上传到服务器。

### 支持的供应商及配置项

| 供应商 | 必填环境变量 | 说明 |
|--------|-------------|------|
| AWS Bedrock | `AI_PROVIDER=bedrock` | 使用 AWS 凭证或 IAM 角色 |
| OpenAI | `OPENAI_API_KEY` | 支持自定义 base_url |
| Anthropic | `ANTHROPIC_API_KEY` | 支持 extended thinking |
| Google AI | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 系列模型 |
| Azure OpenAI | `AZURE_API_KEY` + `AZURE_RESOURCE_NAME` | Azure 托管的 OpenAI |
| Ollama | 无（本地默认） | 本地运行的大模型 |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek 官方 API |
| SiliconFlow | `SILICONFLOW_API_KEY` | 硅基流动平台 |
| GLM（智谱） | `GLM_API_KEY` | 智谱 AI 平台 |
| Qwen（通义） | `QWEN_API_KEY` | 阿里通义千问 |
| Kimi（月之暗面） | `KIMI_API_KEY` | 月之暗面平台 |
| MiniMax | `MINIMAX_API_KEY` | MiniMax 平台 |
| 七牛云 | `QINIU_API_KEY` | 七牛 AI 平台 |

### 推荐模型

生成 draw.io XML 需要模型具备较强的长文本生成和严格格式约束能力。推荐以下模型：

- Claude Sonnet 4.5（最佳 draw.io 支持，训练过云架构图标）
- GPT-5.1
- Gemini 3 Pro
- DeepSeek V3.2 / R1

---

## 文件操作

### 导出图表

- 在 draw.io 画布中右键选择 **Export**
- 支持导出格式：PNG、SVG、PDF、HTML、XML
- 可选择是否包含透明背景

### 导入图表

- 支持导入 `.drawio`、`.xml` 格式的图表文件
- 通过文件上传按钮导入

### 保存与加载

- 图表数据自动保存在浏览器 IndexedDB 中
- 关闭浏览器后图表数据不会丢失
- 清除浏览器数据会删除已保存的图表

---

## 会话管理

### 新建会话

点击顶部的 **新建** 按钮，开始一个新的对话。

### 切换历史会话

- 在会话列表中选择之前的对话
- 每个会话保存了当时的图表状态和对话历史

### 删除会话

- 在会话列表中悬停，点击删除按钮
- 删除后无法恢复

---

## 设置

### 聊天面板设置

- **AI 供应商**：选择使用的 AI 平台
- **API Key**：输入对应平台的认证密钥
- **模型**：选择具体使用的模型
- **系统消息**：自定义 AI 的系统提示词，用于个性化 AI 的行为

### 访问码（可选）

如果管理员配置了 `ACCESS_CODE_LIST`，首次使用时需要输入访问码。

---

## Electron 桌面版

### 安装

前往 [Releases 页面](https://github.com/DayuanJiang/next-ai-draw-io/releases) 下载对应平台的安装包：

- **Windows**：`.exe` 安装程序或便携版
- **macOS**：`.dmg` 或 `.zip`
- **Linux**：`.AppImage`、`.deb` 或 `.rpm`

### Windows 7 兼容性

本项目支持 Windows 7 系统，但需要注意：

- Electron 版本为 22.3（最后一个支持 Win7 的版本，基于 Chromium 108）
- 建议使用 Chrome 109 或 Firefox 115+ 浏览器访问 Web 版
- 部分新模型可能需要更新的浏览器才能正常使用 AI 功能

### 配置

桌面版启动后可在设置中配置 AI 供应商和 API Key，配置保存在本地文件中。

---

## 常见问题

### 图表无法显示

- 检查 `embed.diagrams.net` 是否可访问（中国大陆用户可能需要代理）
- 如果使用自托管 draw.io，确保 `NEXT_PUBLIC_DRAWIO_BASE_URL` 配置正确
- 清除浏览器缓存后重试

### AI 回复报错

- 检查 API Key 是否正确
- 确认所选模型支持图表生成能力
- 查看控制台是否有网络错误

### 使用限制

- 演示站点可能有每日请求次数和 Token 数量限制
- 配置自己的 API Key 后不受演示站点限制
- 自部署用户可配置 DynamoDB 实现服务端配额管理

### PDF 上传失败

- 确认 PDF 文件未加密
- 文件大小和内容长度可能有限制
- 尝试将 PDF 内容复制为文本文件后上传

### 浏览器兼容性

- 推荐 Chrome 109+、Firefox 115+、Edge 109+、Safari 15+
- Windows 7 用户请使用 Chrome 109 或 Firefox 115
- 部分 CSS 特性（如 oklch 颜色）在旧版浏览器中不可用，已自动降级
