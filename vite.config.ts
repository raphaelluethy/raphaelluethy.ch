import { pathToFileURL } from "node:url";
import { evaluate } from "@mdx-js/mdx";
import { h } from "preact";
import * as jsxRuntime from "preact/jsx-runtime";
import { renderToString } from "preact-render-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig, type Plugin } from "vite";

/* Posts are MDX files in /posts. Each one is compiled and rendered to
   static HTML at build time, so the browser gets a string and no MDX or
   JSX runtime. A module exports { frontmatter, html }. */
function mdxPosts(): Plugin {
  return {
    name: "mdx-posts",
    async transform(code, id) {
      if (!id.endsWith(".mdx")) return null;
      const mod = await evaluate(code, {
        ...jsxRuntime,
        baseUrl: pathToFileURL(id).href,
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm]
      });
      const html = renderToString(h(mod.default, {}));
      return {
        code: `export const frontmatter = ${JSON.stringify(mod.frontmatter ?? {})};\nexport const html = ${JSON.stringify(html)};\n`,
        map: null
      };
    }
  };
}

export default defineConfig({
  plugins: [mdxPosts()],
  build: {
    rollupOptions: {
      input: "index.html",
    },
    assetsDir: "assets",
  },
});
