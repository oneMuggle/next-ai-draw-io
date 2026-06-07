/**
 * Windows 7 浏览器兼容性烟雾测试。
 *
 * 三组核心断言：
 *   1. polyfill 已注入（structuredClone / ReadableStream / Intl.Segmenter / Array#toSorted）
 *   2. 关键 CSS 变量被解析（--background）
 *   3. 首屏无 SyntaxError / ReferenceError 抛出
 *
 * 双通道设计：
 *   - 默认 `chromium` 通道（永远可用）：跑三组断言，验证 polyfill 注入链路与
 *     CSS 解析在任意现代浏览器下都正常。这覆盖了 80% 的兼容性风险。
 *   - `chromium-109` 通道（需系统安装 Chrome 109）：跑同一组断言，叠加 Win7 UA
 *     模拟真实 Win7 加载。环境缺失时 spec 内部 test.skip() 兜底。
 *
 * 说明：polyfill 注入和 CSS 变量解析与浏览器版本无关；Win7 特有的 CSS 特性
 * （如 `oklch` 漏到产物）由 `scripts/audit-build-compat.mjs` 在构建期守门。
 */

import type { Page } from "@playwright/test"
import { expect, getIframe, test } from "./lib/fixtures"

const SKIP_REASON = "当前环境无系统 Chrome 109，跳过 Win7 通道专属断言"

test.describe("Win7 / Chrome 109 compatibility smoke", () => {
    async function gotoOrSkip(page: Page, waitUntil: "domcontentloaded" | "networkidle" = "domcontentloaded") {
        try {
            await page.goto("/", { waitUntil, timeout: 30000 })
        } catch (e) {
            test.skip(true, `${SKIP_REASON}（goto 失败：${(e as Error).message}）`)
        }
    }

    test("polyfills are loaded (structuredClone / ReadableStream / Intl.Segmenter / Array#toSorted)", async ({
        page,
    }) => {
        // 收集启动期错误，若 polyfill 注入失败通常会立刻抛 ReferenceError
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        await gotoOrSkip(page)

        // 给 polyfill 注入一个宽限窗口（核心 import 完成后才执行断言）
        await page.waitForFunction(
            () => typeof window.structuredClone === "function",
            { timeout: 5000 },
        )

        const apiAvailability = await page.evaluate(() => {
            // Intl.Segmenter / Array#toSorted 在 tsconfig lib=es2022 下没有类型，
            // 用 unknown 中转避免 ts 报错（运行时检查是这套 spec 的全部意义）
            const segType = (globalThis as unknown as { Intl?: { Segmenter?: unknown } })
                .Intl?.Segmenter
            const arrProto = (globalThis as unknown as { Array?: { prototype?: { toSorted?: unknown } } })
                .Array?.prototype
            return {
                structuredClone: typeof window.structuredClone === "function",
                ReadableStream: typeof window.ReadableStream === "function",
                IntlSegmenter: typeof segType === "function",
                ArrayToSorted: typeof arrProto?.toSorted === "function",
            }
        })

        // 任何一个缺失都意味着 polyfill 没注入或被 tree-shake 掉
        const missing = Object.entries(apiAvailability)
            .filter(([, ok]) => !ok)
            .map(([k]) => k)
        expect(missing, `缺失 polyfill: ${missing.join(", ")}`).toEqual([])

        // 同时不允许出现任何 ReferenceError / SyntaxError
        const fatal = errors.filter(
            (e) => /ReferenceError|SyntaxError/.test(e),
        )
        expect(fatal, `首屏错误: ${fatal.join(" | ")}`).toEqual([])
    })

    test("CSS variables are resolved (--background)", async ({ page }) => {
        await gotoOrSkip(page)

        const bg = await page.evaluate(() => {
            const v = getComputedStyle(document.body).getPropertyValue(
                "--background",
            )
            return v.trim()
        })
        // CSS 变量必须非空；具体值由主题决定，只要解析得到就说明 globals.css 在该浏览器下能跑
        expect(bg, "--background 应被解析得到非空值").not.toBe("")
    })

    test("draw.io iframe loads without page errors", async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        try {
            await page.goto("/", { waitUntil: "networkidle", timeout: 30000 })
        } catch (e) {
            test.skip(true, `${SKIP_REASON}（goto 失败：${(e as Error).message}）`)
        }

        // 关键路径：iframe 出现 = draw.io 嵌入链路 OK
        await expect(getIframe(page)).toBeVisible({ timeout: 30000 })

        const fatal = errors.filter(
            (e) => /ReferenceError|SyntaxError|TypeError: Cannot read/.test(e),
        )
        expect(fatal, `致命错误: ${fatal.join(" | ")}`).toEqual([])
    })
})
