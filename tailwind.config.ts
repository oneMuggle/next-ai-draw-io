import tailwindcssTypography from "@tailwindcss/typography"
import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
        "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: "hsl(var(--card))",
                "card-foreground": "hsl(var(--card-foreground))",
                popover: "hsl(var(--popover))",
                "popover-foreground": "hsl(var(--popover-foreground))",
                primary: "hsl(var(--primary))",
                "primary-foreground": "hsl(var(--primary-foreground))",
                secondary: "hsl(var(--secondary))",
                "secondary-foreground": "hsl(var(--secondary-foreground))",
                muted: "hsl(var(--muted))",
                "muted-foreground": "hsl(var(--muted-foreground))",
                accent: "hsl(var(--accent))",
                "accent-foreground": "hsl(var(--accent-foreground))",
                destructive: "hsl(var(--destructive))",
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                sidebar: "hsl(var(--sidebar))",
                "sidebar-foreground": "hsl(var(--sidebar-foreground))",
                "sidebar-primary": "hsl(var(--sidebar-primary))",
                "sidebar-primary-foreground":
                    "hsl(var(--sidebar-primary-foreground))",
                "sidebar-accent": "hsl(var(--sidebar-accent))",
                "sidebar-accent-foreground":
                    "hsl(var(--sidebar-accent-foreground))",
                "sidebar-border": "hsl(var(--sidebar-border))",
                "sidebar-ring": "hsl(var(--sidebar-ring))",
                "chart-1": "hsl(var(--chart-1))",
                "chart-2": "hsl(var(--chart-2))",
                "chart-3": "hsl(var(--chart-3))",
                "chart-4": "hsl(var(--chart-4))",
                "chart-5": "hsl(var(--chart-5))",
                "surface-0": "hsl(var(--surface-0))",
                "surface-1": "hsl(var(--surface-1))",
                "surface-2": "hsl(var(--surface-2))",
                "surface-elevated": "hsl(var(--surface-elevated))",
                "border-subtle": "hsl(var(--border-subtle))",
                "border-default": "hsl(var(--border-default))",
                "interactive-hover": "hsl(var(--interactive-hover))",
                "interactive-active": "hsl(var(--interactive-active))",
                success: "hsl(var(--success))",
                "success-muted": "hsl(var(--success-muted))",
            },
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "fade-in": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-right": {
                    from: { opacity: "0", transform: "translateX(16px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
                "message-in": {
                    from: {
                        opacity: "0",
                        transform: "translateY(12px) scale(0.98)",
                    },
                    to: { opacity: "1", transform: "translateY(0) scale(1)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.3s ease-out forwards",
                "slide-in-right": "slide-in-right 0.3s ease-out forwards",
                "message-in": "message-in 0.25s ease-out forwards",
            },
        },
    },
    plugins: [tailwindcssAnimate, tailwindcssTypography],
}

export default config
