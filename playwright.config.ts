import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["list"], ["html"]] : "html",
    webServer: {
        command: process.env.CI ? "npm run start" : "npm run dev",
        port: process.env.CI ? 6001 : 6002,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
    use: {
        baseURL: process.env.CI
            ? "http://localhost:6001"
            : "http://localhost:6002",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
        // Windows 7 / Chrome 109 通道：依赖系统安装的 Chrome（channel: chrome）。
        // 若环境无 Chrome，spec 内部用 test.skip() 兜底，不阻塞主流程。
        {
            name: "chromium-109",
            use: {
                browserName: "chromium",
                channel: "chrome",
                launchOptions: {
                    args: [
                        // 模拟 Win7 + Chrome 109 的 User-Agent
                        "--user-agent=Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
                    ],
                },
            },
        },
    ],
})
