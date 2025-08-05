import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import linaria from "@linaria/vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    linaria({
      include: ["**/*.{ts,tsx}"],
      babelOptions: {
        presets: ["@babel/preset-typescript", "@babel/preset-react"]
      }
    }),
    react()
  ],
  define: {
    "globalThis.__DEV__": JSON.stringify(mode === "development"),
  }
}));
