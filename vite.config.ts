import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  assetsInclude: ["**/src/*.html"],
  build: {
    rollupOptions: {
      input: "index.html",
    },
    assetsDir: "assets",
  },
});
