import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    base: env.VITE_BASE_PATH || "/",
    appType: "spa",
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/setupTests.ts", "src/vite-env.d.ts", "src/main.tsx"],
        thresholds: {
          statements: 90,
          branches: 75,
          functions: 65,
          lines: 90,
        },
      },
    },
  }
})
