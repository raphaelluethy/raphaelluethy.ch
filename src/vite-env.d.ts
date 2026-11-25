/// <reference types="vite/client" />

declare module "*.mdx" {
  export const frontmatter: Record<string, unknown>;
  export const html: string;
}
