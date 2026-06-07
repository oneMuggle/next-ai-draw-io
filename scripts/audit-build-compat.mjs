#!/usr/bin/env node
/**
 * 审计 Next.js 构建产物，确保最低兼容目标为 Chrome 109 / Firefox 115 ESR / Edge 109 / Safari 15。
 *
 * 默认 soft 模式：仅打印报告，不中断。
 * --strict 模式：发现命中即 exit(1)，用于 CI 守门。
 *
 * 用法：
 *   node scripts/audit-build-compat.mjs                # 软提示
 *   node scripts/audit-build-compat.mjs --strict      # 严格
 *   node scripts/audit-build-compat.mjs --json         # 输出 JSON 报告
 *
 * 退出码：
 *   0  无命中
 *   1  --strict 模式下存在命中
 *   2  构建产物目录不存在（提示先跑 npm run build）
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, "..")
const BUILD_DIR = join(PROJECT_ROOT, ".next", "static")

const args = new Set(process.argv.slice(2))
const STRICT = args.has("--strict")
const JSON_OUT = args.has("--json")

// 最低目标版本：与 .browserslistrc 对齐
const TARGET = {
    chrome: 109,
    firefox: 115,
    edge: 109,
    safari: 15,
}
// 兼容性最差者：Chrome 109 / Firefox 115 / Safari 15
// 这里用 Chrome 的版本号作为统一标尺（ES 特性通常 Chrome 落后于 Firefox）
const TARGET_CHROME = TARGET.chrome

// 命中规则：pattern -> { kind, name, why, minChrome }
const RULES = [
    // —— ES2023+ (Chrome 110+) ——
    { kind: "js", name: "Array.prototype.toSorted", pattern: /\.toSorted\s*\(/, minChrome: 110, why: "ES2023 mutable-free sort" },
    { kind: "js", name: "Array.prototype.toReversed", pattern: /\.toReversed\s*\(/, minChrome: 110, why: "ES2023 mutable-free reverse" },
    { kind: "js", name: "Array.prototype.toSpliced", pattern: /\.toSpliced\s*\(/, minChrome: 110, why: "ES2023 mutable-free splice" },
    { kind: "js", name: "Array.prototype.with", pattern: /\.with\s*\(\s*-?\d/, minChrome: 110, why: "ES2023 indexed replacement" },
    { kind: "js", name: "Array.prototype.findLast", pattern: /\.findLast\s*\(/, minChrome: 97, why: "ES2023 reverse find" },
    { kind: "js", name: "Array.prototype.findLastIndex", pattern: /\.findLastIndex\s*\(/, minChrome: 97, why: "ES2023 reverse findIndex" },

    // —— ES2024+ (Chrome 117+/119+) ——
    { kind: "js", name: "Object.groupBy", pattern: /\bObject\.groupBy\s*\(/, minChrome: 117, why: "ES2024 group" },
    { kind: "js", name: "Map.groupBy", pattern: /\bMap\.groupBy\s*\(/, minChrome: 117, why: "ES2024 group" },
    { kind: "js", name: "Object.hasOwn (call)", pattern: /\bObject\.hasOwn\s*\(/, minChrome: 93, why: "ES2022 safer hasOwn" },
    { kind: "js", name: "Promise.withResolvers", pattern: /\bPromise\.withResolvers\s*\(/, minChrome: 119, why: "ES2024 defer-like resolver",
      // PDF.js 自身带了防御性 polyfill：void 0 === Promise.withResolvers && (Promise.withResolvers = ...)
      selfPolyfill: /void\s+0\s*===?\s*Promise\.withResolvers/ },

    // —— Chrome 111+/114+ typed arrays ——
    { kind: "js", name: "ArrayBuffer.prototype.transfer", pattern: /\.transfer\s*\(\s*\)/, minChrome: 111, why: "TypedArray transfer" },
    { kind: "js", name: "ArrayBuffer.prototype.resize", pattern: /\.resize\s*\(\s*\d/, minChrome: 111, why: "GrowableArrayBuffer" },

    // —— String ES2024 ——
    { kind: "js", name: "String.prototype.isWellFormed", pattern: /\.isWellFormed\s*\(/, minChrome: 114, why: "ES2024 unicode well-formed" },
    { kind: "js", name: "String.prototype.toWellFormed", pattern: /\.toWellFormed\s*\(/, minChrome: 114, why: "ES2024 unicode well-formed" },

    // —— CSS Color 4 / Level 4 (Chrome 111+) ——
    { kind: "css", name: "oklch() color", pattern: /\boklch\s*\(/, minChrome: 111, why: "CSS Color 4 oklch" },
    { kind: "css", name: "oklab() color", pattern: /\boklab\s*\(/, minChrome: 111, why: "CSS Color 4 oklab" },
    { kind: "css", name: "color-mix()", pattern: /\bcolor-mix\s*\(/, minChrome: 111, why: "CSS Color 5 mix" },
    { kind: "css", name: "color() function", pattern: /\bcolor\s*\(\s*(?:srgb|display-p3|rec2020|xyz|a98-rgb|prophoto-rgb)/, minChrome: 111, why: "CSS Color 4 explicit color spaces" },

    // —— CSS Selectors L4 ——
    { kind: "css", name: ":has() relational pseudo", pattern: /:has\s*\(/, minChrome: 105, why: "CSS Selectors L4" },
    { kind: "css", name: "@container", pattern: /@container\b/, minChrome: 105, why: "CSS Containment L3" },
]

/**
 * 去除源码中的字符串字面量与注释，避免误报。
 * 对 JS 来说"3 个 R" 模式（单引号/双引号/反引号 + 块/行注释）。
 * 对 CSS 来说字符串场景少，简单用 ' " ` 即可。
 */
function stripNoise(src, kind) {
    let out = src
    // 块注释
    out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    // 行注释（仅 JS）
    if (kind === "js") {
        out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))
    }
    // 字符串：' " `
    out = out.replace(/'([^'\\\n]|\\.)*'/g, (m) => " ".repeat(m.length))
    out = out.replace(/"([^"\\\n]|\\.)*"/g, (m) => " ".repeat(m.length))
    out = out.replace(/`([^`\\]|\\.)*`/g, (m) => " ".repeat(m.length))
    return out
}

function walk(dir, files = []) {
    if (!existsSync(dir)) return files
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        const st = statSync(full)
        if (st.isDirectory()) {
            walk(full, files)
        } else {
            const ext = extname(full)
            if (ext === ".js" || ext === ".css") files.push(full)
        }
    }
    return files
}

function auditFile(file) {
    const ext = extname(file).slice(1)
    const raw = readFileSync(file, "utf8")
    const clean = stripNoise(raw, ext)
    const hits = []
    for (const rule of RULES) {
        if (rule.kind !== ext) continue
        // 只报告"高于目标"的特性；target 本身支持的特性不报警
        if (rule.minChrome <= TARGET_CHROME) continue
        if (rule.pattern.test(clean)) {
            // 同文件若已自带 self-polyfill 防御（void 0 === X && (X = ...）则视为已覆盖
            if (rule.selfPolyfill && rule.selfPolyfill.test(clean)) {
                continue
            }
            // 给出第一个匹配的位置，便于人工定位
            const m = clean.match(rule.pattern)
            const idx = m?.index ?? -1
            // 简单的行号换算：取原始 raw 的前 idx 个换行符
            const before = raw.slice(0, idx)
            const line = (before.match(/\n/g)?.length ?? 0) + 1
            hits.push({ rule, line })
        }
    }
    return hits
}

function main() {
    if (!existsSync(BUILD_DIR)) {
        console.error(`[audit] 构建产物不存在: ${BUILD_DIR}`)
        console.error(`[audit] 请先运行: npm run build`)
        process.exit(2)
    }

    const files = walk(BUILD_DIR)
    const report = []
    for (const f of files) {
        const hits = auditFile(f)
        if (hits.length) {
            report.push({ file: f.replace(PROJECT_ROOT + "/", ""), hits })
        }
    }

    const totalHits = report.reduce((s, r) => s + r.hits.length, 0)
    const summary = {
        buildDir: BUILD_DIR.replace(PROJECT_ROOT + "/", ""),
        filesScanned: files.length,
        filesFlagged: report.length,
        totalHits,
        mode: STRICT ? "strict" : "soft",
        targets: { ...TARGET },
        report,
    }

    if (JSON_OUT) {
        console.log(JSON.stringify(summary, null, 2))
    } else {
        console.log(`[audit] 扫描 ${summary.filesScanned} 个文件，命中 ${totalHits} 处`)
        console.log(`[audit] 目标: Chrome ${summary.targets.chrome} / Firefox ${summary.targets.firefox} / Edge ${summary.targets.edge} / Safari ${summary.targets.safari}`)
        if (totalHits === 0) {
            console.log("[audit] ✅ 未发现高于目标的语法/特性，Win7 兼容产物干净。")
        } else {
            console.log(`[audit] ⚠️  ${report.length} 个文件存在命中：`)
            for (const r of report) {
                console.log(`\n  ${r.file}`)
                for (const h of r.hits) {
                    console.log(`    - L${h.line}  ${h.rule.name} (需 Chrome >= ${h.rule.minChrome})  ${h.rule.why}`)
                }
            }
        }
    }

    if (STRICT && totalHits > 0) {
        console.error(`\n[audit] --strict 模式下存在 ${totalHits} 处命中，构建失败。请修复或补充 polyfill 后重试。`)
        process.exit(1)
    }
}

main()
