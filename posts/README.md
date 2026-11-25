# Posts

Every `.mdx` file in this folder becomes a post under `/blog/<file name>`.
Push it and the build renders it; nothing else needs editing.

```mdx
---
title: Post title
date: 2026-11-25
description: One or two sentences shown in the list and under the title.
draft: false
---

Markdown as usual, plus JSX where you want it.
```

- `title`, `date` (YYYY-MM-DD) and `description` are the fields the site reads.
- `draft: true` shows the post in `pnpm dev` only and leaves it out of the build.
- GitHub-flavoured Markdown works (tables, task lists, strikethrough).
- Posts are rendered to static HTML at build time, so JSX is for markup
  only: event handlers and hooks do nothing in the browser.
- Images: put them in `public/` and reference them as `/name.png`.
