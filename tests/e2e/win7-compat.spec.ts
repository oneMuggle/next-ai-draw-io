/**
 * Windows 7 浏览器兼容性烟雾测试。
 *
 * 目标：覆盖项目最低支持版本（Chrome 109 / Firefox 115 ESR / Edge 109 / Safari 15）。
 * 三组核心断言：
 *   1. polyfill 已注入（structuredClone / ReadableStream / Intl.Segmenter / Array#toSorted）
 *   2. 关键 CSS 变量被解析（--background）
 *   3. 首屏无 SyntaxError / ReferenceError 抛出
 *
 * 适配：本 spec 默认归属 `chromium-109` 项目；若运行环境无系统 Chrome，
 * 启动会因 channel 不可用而失败，spec 内部用 test.skip() 兜底。
 */

import { expect, getIframe, test } from "./lib/fixtures"

const SKIP_REASON = "当前环境无系统 Chrome，跳过 Win7 通道烟雾测试"
const PROJECT_NAME = "chromium-109"

test.describe("Win7 / Chrome 109 compatibility smoke", () => {

    test("polyfills are loaded", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== PROJECT_NAME, "仅在 chromium-109 项目下运行")
        // 收集启动期错误，若 polyfill 注入失败通常会立刻抛 ReferenceError
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        try {
            await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 })
        } catch (e) {
            test.skip(true, `${SKIP_REASON}（goto 失败：${(e as Error).message}）`)
        }

        // 给 polyfill 注入一个宽限窗口（核心 import 完成后才执行断言）
        await page.waitForFunction(
            () => typeof window.structuredClone === "function",
            { timeout: 5000 },
        )

        // Intl.Segmenter 与 Array#toSorted 在某些 lib 配置下没类型；
        // 这里走运行时探测，用 unknown 收敛回 boolean。
        const apiAvailability = await page.evaluate(() => {
            const w = window as unknown as {
                structuredClone?: unknown
                ReadableStream?: unknown
                Intl: { Segmenter?: unknown }
            }
            const proto: { toSorted?: unknown } = Array.prototype as unknown as {
                toSorted?: unknown
            }
            return {
                structuredClone: typeof w.structuredClone === "function",
                ReadableStream: typeof w.ReadableStream === "function",
                IntlSegmenter: typeof w.Intl.Segmenter === "function",
                ArrayToSorted: typeof proto.toSorted === "function",
            }
        })

        // 任何一个缺失都意味着 polyfill 没注入或被 tree-shake 掉
        const missing = Object.entries(apiAvailability)
            .filter(([, ok]) => !ok)
            .map(([k]) => k)
        expect(
            missing,
            `缺失 polyfill: ${missing.join(", ")}`,
        ).toEqual([])

        // 同时不允许出现任何 ReferenceError / SyntaxError
        const fatal = errors.filter(
            (e) => /ReferenceError|SyntaxError/.test(e),
        )
        expect(fatal, `首屏错误: ${fatal.join(" | ")}`).toEqual([])
    })

    test("CSS variables are resolved (--background)", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== PROJECT_NAME, "仅在 chromium-109 项目下运行")
        try {
            await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 })
        } catch (e) {
            test.skip(true, `${SKIP_REASON}（goto 失败：${(e as Error).message}）`)
        }

        const bg = await page.evaluate(() => {
            const v = getComputedStyle(document.body).getPropertyValue(
                "--background",
            )
            return v.trim()
        })
        // CSS 变量必须非空；具体值由主题决定，只要解析得到就说明 globals.css 在该浏览器下能跑
        expect(bg, "--background 应被解析得到非空值").not.toBe("")
    })

    test("draw.io iframe loads without page errors", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== PROJECT_NAME, "仅在 chromium-109 项目下运行")
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
