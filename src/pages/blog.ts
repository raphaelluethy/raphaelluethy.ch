import { POSTS } from "../data/posts";
import { escapeHtml, formatDate, renderPrompt } from "../utils/html";

export function renderBlogIndexPage(): string {
  const rows = POSTS.map(
    (post) => `
      <li>
        <a class="post-row" href="/blog/${escapeHtml(post.slug)}" data-link>
          <span class="post-row__meta">${escapeHtml(post.date)}</span>
          <span class="post-row__body">
            <span class="post-row__title">${escapeHtml(post.title)}</span>
            <span class="post-row__excerpt">${escapeHtml(post.excerpt)}</span>
          </span>
          <span class="post-row__meta post-row__meta--end">${escapeHtml(post.readTime)}</span>
        </a>
      </li>
    `
  ).join("");

  return `
    <section class="section" aria-labelledby="writing-title">
      <div class="container">
        ${renderPrompt("ls -lt writing")}
        <h1 class="sr-only" id="writing-title">Writing</h1>
        <p class="ls-total">total ${POSTS.length}</p>
        ${rows ? `<ul class="ls">${rows}</ul>` : ""}
      </div>
    </section>
  `;
}

export function renderBlogPostPage(slug: string): string {
  const index = POSTS.findIndex((p) => p.slug === slug);
  const post = POSTS[index];

  if (!post) {
    return `
      <section class="section">
        <div class="container">
          ${renderPrompt(`cat writing/${slug}`)}
          <p class="article-missing">cat: writing/${escapeHtml(slug)}: No such file or directory</p>
          <a class="text-link" href="/blog" data-link>ls writing</a>
        </div>
      </section>
    `;
  }

  const prevPost = index > 0 ? POSTS[index - 1] : null;
  const nextPost = index < POSTS.length - 1 ? POSTS[index + 1] : null;

  return `
    <section class="section">
      <div class="container">
        ${renderPrompt(`cat writing/${post.slug}`)}
        <article class="article">
          <header class="article__header">
            <p class="article__meta">${escapeHtml(formatDate(post.date))} · ${escapeHtml(post.readTime)}</p>
            <h1>${escapeHtml(post.title)}</h1>
            ${post.excerpt ? `<p class="article__excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
          </header>

          <div class="article__body">${post.html}</div>

          <nav class="article__nav" aria-label="More writing">
            <a class="text-link" href="/blog" data-link>all writing</a>
            ${prevPost ? `<a class="text-link" href="/blog/${escapeHtml(prevPost.slug)}" data-link>newer: ${escapeHtml(prevPost.title)}</a>` : ""}
            ${nextPost ? `<a class="text-link" href="/blog/${escapeHtml(nextPost.slug)}" data-link>older: ${escapeHtml(nextPost.title)}</a>` : ""}
          </nav>
        </article>
      </div>
    </section>
  `;
}
