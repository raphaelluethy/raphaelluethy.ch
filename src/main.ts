import { SITE } from "./data/site";
import { POSTS } from "./data/posts";
import { navigateTo, parseRoute } from "./router";
import { bindHomePage, renderHomePage } from "./pages/home";
import { renderBlogIndexPage, renderBlogPostPage } from "./pages/blog";
import { escapeHtml, renderPrompt } from "./utils/html";
import { bindVimKeymaps } from "./utils/vim";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "rl-theme";

function getInitialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Ignore storage access errors
  }
  return "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors
  }
}

function renderThemeIcon(theme: Theme): string {
  if (theme === "dark") {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
}

function themeLabel(theme: Theme): string {
  return theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function buildShell(theme: Theme): string {
  return `
    <header class="site-header" data-header>
      <div class="container header-inner">
        <a class="brand-link" href="/" data-link aria-label="${escapeHtml(SITE.name)}, home">
          <img class="brand-logo" src="/logo.png" width="22" height="22" alt="" />
          <span class="brand-name">~/${escapeHtml(SITE.domain)}</span>
        </a>

        <div class="header-right">
          <nav class="site-nav" aria-label="Primary">
            <a class="nav-link" href="/cv" data-link data-nav="timeline">timeline</a>
            <a class="nav-link" href="/projects" data-link data-nav="projects">projects</a>
            <a class="nav-link" href="/blog" data-link data-nav="blog">writing</a>
          </nav>
          <button
            type="button"
            class="theme-toggle"
            data-theme-toggle
            aria-label="${themeLabel(theme)}"
            title="${themeLabel(theme)}"
          >${renderThemeIcon(theme)}</button>
        </div>
      </div>
    </header>

    <main id="main-content" data-main></main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div class="footer-shell">
          ${renderPrompt(":wq")}
          <p aria-hidden="true">zsh: command not found: :wq</p>
          ${renderPrompt("", { cursor: true })}
        </div>
        <div class="footer-links">
          <span>i use vim btw</span>
          <a href="${escapeHtml(SITE.links.repo)}" target="_blank" rel="noopener noreferrer">source</a>
        </div>
      </div>
    </footer>
  `;
}

const appRoot = document.querySelector<HTMLElement>("#app");

if (appRoot) {
  let theme = getInitialTheme();
  applyTheme(theme);

  appRoot.innerHTML = buildShell(theme);

  const headerEl = appRoot.querySelector<HTMLElement>("[data-header]");
  const mainEl = appRoot.querySelector<HTMLElement>("[data-main]");
  const themeBtn = appRoot.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  const navLinks = Array.from(appRoot.querySelectorAll<HTMLAnchorElement>("[data-nav]"));

  /* Which view is currently in the DOM, so moving between sections of
     the profile scrolls instead of re-rendering. */
  let renderedKey = "";
  let cleanupPage: (() => void) | null = null;
  let chromeRafId: number | null = null;

  const setActiveNav = (navKey: string): void => {
    for (const link of navLinks) {
      const active = link.dataset.nav === navKey;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  };

  const syncScrollChrome = (): void => {
    if (headerEl) {
      headerEl.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    if (renderedKey !== "home" || !mainEl) return;

    const headerHeight = headerEl?.offsetHeight ?? 56;
    const threshold = headerHeight + 120;
    const timelineEl = mainEl.querySelector<HTMLElement>("#timeline");
    const projectsEl = mainEl.querySelector<HTMLElement>("#projects");

    const atBottom =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 24;

    if (projectsEl && (atBottom || projectsEl.getBoundingClientRect().top <= threshold)) {
      setActiveNav("projects");
    } else if (timelineEl && timelineEl.getBoundingClientRect().top <= threshold) {
      setActiveNav("timeline");
    } else {
      setActiveNav("");
    }
  };

  const scrollToSection = (sectionId: string, behavior: ScrollBehavior): void => {
    if (!mainEl) return;
    const sectionEl = mainEl.querySelector<HTMLElement>(`#${sectionId}`);
    if (!sectionEl) {
      window.scrollTo({ top: 0, behavior });
      return;
    }

    const headerHeight = headerEl?.offsetHeight ?? 56;
    const targetY = Math.max(
      0,
      Math.round(sectionEl.getBoundingClientRect().top + window.scrollY - headerHeight)
    );
    window.scrollTo({ top: targetY, behavior });
  };

  const renderCurrentRoute = (smooth = false): void => {
    if (!mainEl) return;
    const match = parseRoute(window.location.pathname);
    const navKey = match.page === "blog" ? "blog" : (match.section ?? "");

    setActiveNav(navKey);

    const key = match.page === "home" ? "home" : `blog:${match.slug ?? ""}`;
    const alreadyRendered = key === renderedKey;
    const behavior: ScrollBehavior =
      smooth && alreadyRendered && !prefersReducedMotion() ? "smooth" : "instant";

    if (!alreadyRendered) {
      cleanupPage?.();
      cleanupPage = null;
      renderedKey = key;

      if (match.page === "home") {
        mainEl.innerHTML = renderHomePage();
        cleanupPage = bindHomePage(mainEl);
      } else if (match.slug) {
        mainEl.innerHTML = renderBlogPostPage(match.slug);
      } else {
        mainEl.innerHTML = renderBlogIndexPage();
      }
    }

    if (match.page === "home") {
      document.title = SITE.name;
    } else {
      const post = match.slug ? POSTS.find((p) => p.slug === match.slug) : undefined;
      document.title = `${post ? post.title : "Writing"} · ${SITE.name}`;
    }

    if (match.page === "home" && match.section) {
      scrollToSection(match.section, behavior);
    } else {
      window.scrollTo({ top: 0, behavior });
    }

    syncScrollChrome();
  };

  window.addEventListener(
    "scroll",
    () => {
      if (chromeRafId !== null) return;
      chromeRafId = window.requestAnimationFrame(() => {
        chromeRafId = null;
        syncScrollChrome();
      });
    },
    { passive: true }
  );

  appRoot.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest<HTMLAnchorElement>("a[data-link]");
    if (!anchor) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    event.preventDefault();
    navigateTo(href, () => renderCurrentRoute(true));
  });

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      themeBtn.innerHTML = renderThemeIcon(theme);
      themeBtn.setAttribute("aria-label", themeLabel(theme));
      themeBtn.setAttribute("title", themeLabel(theme));
    });
  }

  window.addEventListener("popstate", () => renderCurrentRoute(false));

  bindVimKeymaps();
  renderCurrentRoute(false);
}
