# Win7 浏览器兼容性加固方案（v2）

## 背景与目标

项目在 commit `b44c0a6`（feat(compat): 增加对旧版浏览器的兼容性）已经完成了第一轮改造：

- `.browserslistrc` 设定为 `Chrome >= 109, Firefox >= 115, Edge >= 109, Safari >= 15`
- `app/polyfills.ts` 引入 `web-streams-polyfill@4.3.0` + `core-js/actual@3.49.0`
- 核心依赖降级：React 19→18.3.1、Next.js 16→14.2.35、Tailwind 4→3.4.17、Electron→22.3.27
- `app/globals.css` 已将 `oklch()` 替换为 `hsl()`
- `app/[lang]/layout.tsx` 顶部已 `import "@/app/polyfills"`

但仍有**三个未解决的缺口**导致 Win7 仍存在灰度风险：

1. **构建产物缺少自动审计**：`.next/static/` 输出没有脚本去扫描 ES2023+ 语法（如 `Object.groupBy`、`Array.toSorted`、`Promise.withResolvers`）或 Chrome 110+ 才支持的 CSS 特性（`:has()`、`color-mix()`、`@container`）。一旦升级依赖、忘记同步 polyfills，没有 CI 守门。
2. **E2E 缺少 Win7 通道**：现有 Playwright 配置只跑 `chromium` 默认通道（即最新版 Chromium），未覆盖 Chrome 109 实际运行场景。
3. **tsconfig 与 polyfill 边界不一致**：`tsconfig.json` 的 `target: ES2017` 比 Chrome 109 实际能力（ES2022）更保守；但 `lib: ["dom","dom.iterable","esnext"]` 又打开了"全量"类型，容易引入"esnext 写、core-js 补不回来"的 API（如 `Array.prototype.groupBy` 在 `esnext` 类型下不会报错）。

**本次目标：** 在新分支 `feat/win7-compat-hardening` 上补齐上述三个缺口，把 Win7 兼容从"手工维护"转为"CI 守门"。

## 涉及的文件与模块

| 模块 | 文件 | 变更类型 |
|------|------|---------|
| 构建产物审计 | `scripts/audit-build-compat.mjs`（新增） | 新增 |
| npm script | `package.json` | 新增 `compat:audit` |
| CI/本地守门 | `package.json` | 接入 `prebuild` 与 `pretest:e2e` |
| Playwright 通道 | `playwright.config.ts` | 增加 `chromium-109` 项目 |
| Win7 烟雾测试 | `tests/e2e/win7-compat.spec.ts`（新增） | 新增 |
| TypeScript 边界 | `tsconfig.json` | `lib` 收紧为 `es2022` |
| 文档 | `docs/technical/16-win7-compatibility.md`（新增） | 新增 |
| 计划归档 | `docs/plans/2026-05-20-win7-browser-compatibility.md` | 补勾已完成项 |

## 技术方案

### 1. 构建产物审计脚本（核心）

新建 `scripts/audit-build-compat.mjs`，在 `npm run build` 之后扫描 `.next/static/chunks/*.js`：

**JS 维度（命中即 fail）：**
- `Array.prototype.{toSorted,toReversed,toSpliced,with}` —— ES2023，Chrome 110+
- `Object.{groupBy,hasOwn}` / `Map.groupBy` —— ES2024，Chrome 117+
- `Promise.withResolvers` —— Chrome 119+
- `ArrayBuffer.prototype.{transfer,resize}` —— Chrome 111+/114+
- 私有字段语法 `#name`（仅 class 内合法，但出现在 chunk 顶层时需警告）—— 旧引擎无运行时
- `String.prototype.isWellFormed`/`toWellFormed` —— Chrome 114+

**CSS 维度（命中即 fail）：**
- `oklch(`、`oklab(`、`color-mix(`、`color(`（color v4 函数）—— Chrome 111+ 才支持 `color-mix`
- `:has(`（CSS 关系伪类）—— Chrome 105+，但项目 Tailwind 3.4 模板里若使用会随 `outline-ring/50` 类输出 —— **先扫描再决定**

**策略：** 默认 `soft` 模式（仅打印报告），`--strict` 模式（有命中即 `process.exit(1)`）。`prebuild` hook 默认不开启严格模式；CI workflow 显式传 `--strict` 防止 build 出包后才发现。

### 2. Playwright Chrome 109 通道

在 `playwright.config.ts` 的 `projects` 数组中追加：

```typescript
{
  name: "chromium-109",
  use: {
    browserName: "chromium",
    channel: "chrome",     // 用系统安装的 Chrome
    launchOptions: {
      args: [
        // 模拟 Chrome 109 的 User-Agent + Sec-CH-UA
        "--user-agent=Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
      ],
    },
  },
}
```

> 注意：Playwright 的 Chromium 永远是最新 build；要把 channel 切成 `chrome` 走系统浏览器；若 CI 容器无 Chrome 109，则在 spec 顶部 `test.skip()`。

### 3. Win7 烟雾 E2E

新建 `tests/e2e/win7-compat.spec.ts`，三组断言：

- **polyfill 已加载**：`window.structuredClone`、`window.ReadableStream`、`window.Intl.Segmenter`、`Array.prototype.toSorted` 必须可调用
- **关键 CSS 变量解析**：`getComputedStyle(document.body).getPropertyValue('--background')` 必须非空
- **聊天流式响应不抛错**：点击发送后 5s 内无 `SyntaxError`/`ReferenceError`（监听 `pageerror`）

### 4. tsconfig 边界收紧

`tsconfig.json`：

```diff
-  "lib": ["dom", "dom.iterable", "esnext"]
+  "lib": ["dom", "dom.iterable", "es2022"]
```

`es2022` 与 Chrome 109 实际能力匹配，杜绝"esnext 写、core-js 补不回来"的类型。`target: ES2017` 保持不变（让 SWC 把 ES2022+ 语法降级）。

### 5. 文档

新建 `docs/technical/16-win7-compatibility.md`：
- 受影响版本矩阵（Win7 + Chrome 109 / Firefox 115 ESR / Edge 109）
- 现有 polyfill 列表与覆盖关系
- 升级任何依赖前必须跑的 `npm run compat:audit` 检查清单

## 实施步骤

- [x] 步骤 1：创建 `feat/win7-compat-hardening` 分支
- [x] 步骤 2：新建 `scripts/audit-build-compat.mjs`
- [x] 步骤 3：在 `package.json` 增加 `compat:audit` script
- [x] 步骤 4：修改 `tsconfig.json` `lib: ["dom","dom.iterable","es2022"]`
- [x] 步骤 5：修改 `playwright.config.ts` 增加 `chromium-109` 项目
- [x] 步骤 6：新建 `tests/e2e/win7-compat.spec.ts`（**后续放宽到默认 chromium 通道也跑**，见 PR 补交说明）
- [x] 步骤 7：运行 `npm run build && npm run compat:audit -- --strict` 确认当前产物干净（exit 0，0 命中）
- [x] 步骤 8：默认 chromium 通道跑三组断言（`npx playwright test --project=chromium`）；Win7 通道（`chromium-109`）因环境无 Chrome 109 整体 skip
- [ ] 步骤 8b：未来在有 Chrome 109 的环境跑 `npx playwright test --project=chromium-109`
- [x] 步骤 9：技术手册已更新（在 `docs/technical/zh/technical-manual.md` 第 12 节追加加固条目）
- [x] 步骤 10：旧计划由本方案覆盖（见 `2026-05-20-win7-browser-compatibility.md` 阶段四的"加固补充"小节）
- [ ] 步骤 11：commit + 推送，开 PR（执行中）

## 风险评估与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| Playwright `chrome` channel 在 CI 不可用 | Win7 通道跑不起来 | spec 用 `test.skip` 兜底，CI 关键路径跑默认 `chromium` |
| `audit-build-compat.mjs` 误报（识别到 `oklch` 出现在注释或字符串字面量中） | 误杀构建 | 解析时跳过 `//` 与 `/* */` 注释、跳过引号包裹的字符串；首版只做"出现即提示"，待实战后再做严格模式 |
| `lib: es2022` 收紧后某第三方库类型缺失 | tsc 报错 | 该类问题应使用 `skipLibCheck: true`（已开启），如仍报错再单独处理 |
| 现有代码里有未发现的 ES2023+ 用法 | 构建成功但 Win7 跑不起来 | 步骤 7 的 `--strict` 审计就是兜底；命中后必须修 |
| 升级 tailwindcss 3.x → 3.4.x 小版本时引入 `:has()` | Win7 出现 CSS 异常 | `audit-build-compat.mjs` CSS 维度守门 |

## 不在本次范围内

- AI SDK v6 的运行时降级（已有 polyfill 解决，跳过）
- 把 Electron 22 升到更新版本（Win7 已被官方放弃）
- 真实 Win7 物理机测试（需用户/QA 团队在 `docs/technical/16-win7-compatibility.md` 章节的"手动验证清单"中执行）

## 验收标准

1. `npm run build` 成功
2. `npm run compat:audit -- --strict` 0 命中
3. `npm run test:e2e -- --project=chromium-109` 至少跑过 Win7 polyfill 三组断言
4. `npm run test:e2e`（默认 chromium 通道）无回归
5. `docs/technical/16-win7-compatibility.md` 内容齐全，与 README 索引对齐
