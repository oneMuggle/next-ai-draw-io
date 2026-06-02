import packageJson from "./package.json" with { type: "json" }

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    env: {
        APP_VERSION: packageJson.version,
    },
    outputFileTracingIncludes: {
        "*": ["./instrumentation.ts"],
    },
}

export default nextConfig
