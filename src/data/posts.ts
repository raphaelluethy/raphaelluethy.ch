/* Writing lives in /posts as MDX files, one per post. The file name is
   the URL slug; see posts/README.md for the frontmatter. */

export interface BlogPost {
  slug: string;
  title: string;
  /* YYYY-MM-DD */
  date: string;
  readTime: string;
  excerpt: string;
  /* Rendered at build time by the mdx-posts plugin in vite.config.ts. */
  html: string;
}

interface PostModule {
  frontmatter: Record<string, unknown>;
  html: string;
}

const WORDS_PER_MINUTE = 220;

function toIsoDate(value: unknown): string {
  // YAML turns an unquoted date into a Date, which arrives here as an ISO string.
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function readTime(html: string): string {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

const modules = import.meta.glob<PostModule>("../../posts/*.mdx", { eager: true });

export const POSTS: BlogPost[] = Object.entries(modules)
  .filter(([, mod]) => mod.frontmatter.draft !== true || import.meta.env.DEV)
  .map(([path, mod]) => {
    const slug = path.slice(path.lastIndexOf("/") + 1).replace(/\.mdx$/, "");
    const { title, date, description } = mod.frontmatter;
    return {
      slug,
      title: typeof title === "string" ? title : slug,
      date: toIsoDate(date),
      readTime: readTime(mod.html),
      excerpt: typeof description === "string" ? description : "",
      html: mod.html
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
