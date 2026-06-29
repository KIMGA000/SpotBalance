import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/SpotBalance/",
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: env.VITE_KEEP_CONSOLE !== "true", // 콘솔 로그 삭제
        drop_debugger: true, // 디버거 삭제
      },
    },
  },
});
