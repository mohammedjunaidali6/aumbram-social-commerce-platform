import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.js",
    clearMocks: true,

    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],

    exclude: [
      "node_modules/**",
      "dist/**",
      "e2e/**",
      "server/**",
    ],
  },
});