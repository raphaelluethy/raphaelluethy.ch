import {
  CV_TIMELINE,
  PROJECTS,
  PROJECT_HIGHLIGHT,
  SITE,
  type TimelineEntry,
  type TimelineTrack
} from "../data/site";
import { escapeHtml, renderPrompt } from "../utils/html";

/* ------------------------------------------------------------
   whoami
   ------------------------------------------------------------ */

function renderExternalLink(label: string, url: string): string {
  return `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderWhoami(): string {
  return `
    <section class="section" aria-label="About">
      <div class="container">
        ${renderPrompt("whoami", { typed: true })}
        <div class="whoami">
          <h1 class="whoami__name">${escapeHtml(SITE.name)}</h1>
          <p class="whoami__role">${escapeHtml(SITE.role)}</p>
          <p class="whoami__summary">${escapeHtml(SITE.summary)}</p>
          <p class="whoami__links">
            ${renderExternalLink("github", SITE.links.github)}
            ${renderExternalLink("linkedin", SITE.links.linkedin)}
            ${renderExternalLink("x", SITE.links.x)}
          </p>
        </div>
      </div>
    </section>
  `;
}

/* ------------------------------------------------------------
   Timeline, drawn like `git log --graph`

   One row per entry, newest first. Work and education are two
   branches running down the left, one rail each. An entry with
   `mergesWith` joins the two: its row is a merge commit, and from
   there up to "now" a single rail carries both.

   On desktop viewports where the full stage fits under the header,
   the stage sticks and equal scroll bands step symmetrically down
   and up through every commit. Clicking any commit glides straight
   to its scroll position. On narrow or short viewports, scrolling
   stays native and entries expand cleanly on click or tap.
   ------------------------------------------------------------ */

const TRACKS: Array<{ id: TimelineTrack; label: string }> = [
  { id: "experience", label: "work" },
  { id: "education", label: "education" }
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseMonth(yearMonth: string): { year: number; month: number } {
  const [year, month] = yearMonth.split("-").map(Number);
  return { year, month: month || 1 };
}

function formatMonth(yearMonth: string): string {
  const { year, month } = parseMonth(yearMonth);
  return `${MONTHS[month - 1]} ${year}`;
}

function formatRange(entry: TimelineEntry): string {
  return `${formatMonth(entry.start)}–${entry.end ? formatMonth(entry.end) : "now"}`;
}

/* "3 yr 1 mo", counted in whole months with the end month included. */
function formatDuration(entry: TimelineEntry, now: Date): string {
  const index = (yearMonth: string): number => {
    const { year, month } = parseMonth(yearMonth);
    return year * 12 + month - 1;
  };
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const endIndex = entry.end ? index(entry.end) : nowIndex;
  if (endIndex > nowIndex) return "in progress";
  const months = endIndex - index(entry.start) + 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const text = [years ? `${years} yr` : "", rest ? `${rest} mo` : ""].filter(Boolean).join(" ");
  return entry.end ? text : `${text} so far`;
}

function trackLabel(track: TimelineTrack): string {
  return TRACKS.find((item) => item.id === track)?.label ?? track;
}

const trackColumn = (track: TimelineTrack): number =>
  Math.max(TRACKS.findIndex((item) => item.id === track), 0);

const trackClass = (track: TimelineTrack): string =>
  track === "education" ? "is-edu" : "is-work";

interface Graph {
  /* Entries, newest first. */
  entries: TimelineEntry[];
  /* Row of the merge commit, or -1 when the branches never join. */
  mergeRow: number;
  /* Track whose rail carries both branches from the merge upwards. */
  trunk: TimelineTrack;
}

function buildGraph(): Graph {
  const entries = CV_TIMELINE.slice().sort((a, b) => b.start.localeCompare(a.start));
  const mergeRow = entries.findIndex((entry) => entry.mergesWith);
  const partner = entries.find((entry) => entry.id === entries[mergeRow]?.mergesWith);
  return { entries, mergeRow, trunk: partner?.track ?? TRACKS[0].id };
}

const line = (dir: "up" | "down", track: TimelineTrack, column: number, bent = false): string =>
  `<i class="gl-line gl-line--${dir} ${bent ? "gl-line--bent" : ""} ${trackClass(track)}" style="--col:${column}"></i>`;

/* The graph cell of one row. */
function renderRowGraph(graph: Graph, row: number): string {
  const { entries, mergeRow, trunk } = graph;
  const entry = entries[row];
  const trunkColumn = trackColumn(trunk);
  const merged = mergeRow >= 0 && row <= mergeRow;
  const parts: string[] = [];

  TRACKS.forEach((track, column) => {
    const isTrunk = column === trunkColumn;
    // From the merge up, only the trunk goes on.
    if (merged && !isTrunk && row < mergeRow) return;
    const startsBelow = entries.some((other, i) => i > row && other.track === track.id);
    // A rail reaches this row once its branch has started.
    const started = startsBelow || entry.track === track.id;

    if (merged ? isTrunk : started) parts.push(line("up", track.id, column));
    if (!startsBelow) return;
    if (row === mergeRow && !isTrunk) {
      // The other branch bends over into the merge commit.
      const direction = trunkColumn < column ? "left" : "right";
      parts.push(
        `<i class="gl-bend gl-bend--merge-${direction} ${trackClass(track.id)}" style="--lo:${Math.min(column, trunkColumn)};--span:${Math.abs(column - trunkColumn)}"></i>`,
        line("down", track.id, column, true)
      );
    } else {
      parts.push(line("down", track.id, column));
    }
  });

  const column = merged ? trunkColumn : trackColumn(entry.track);
  parts.push(
    row === mergeRow
      ? `<i class="gl-node gl-node--merge ${trackClass(trunk)}" style="--col:${column}"></i>`
      : `<i class="gl-node ${trackClass(entry.track)}" style="--col:${column}"></i>`
  );
  return parts.join("");
}

function renderCommit(entry: TimelineEntry, graph: string, ref: string, isActive: boolean): string {
  return `
    <li class="gl-row ${isActive ? "is-active" : ""}" data-tl-row="${escapeHtml(entry.id)}">
      <span class="gl-graph" aria-hidden="true">${graph}</span>
      <div class="gl-body">
        <button
          type="button"
          class="gl-commit ${isActive ? "is-active" : ""}"
          data-tl-item="${escapeHtml(entry.id)}"
          aria-controls="tl-panel"
        >
          <span class="gl-commit__role">${escapeHtml(entry.role)}</span>
          <span class="gl-commit__meta">
            <span class="gl-commit__org">${escapeHtml(entry.orgShort ?? entry.organization)}</span>
            <span class="gl-commit__date">${escapeHtml(formatRange(entry))}</span>
            ${ref}
          </span>
        </button>
      </div>
    </li>
  `;
}

function renderDetails(entry: TimelineEntry): string {
  const highlights = entry.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return [
    entry.extendedIntro ? `<p>${escapeHtml(entry.extendedIntro)}</p>` : "",
    highlights ? `<ul class="dash-list">${highlights}</ul>` : "",
    entry.focusAreas
      ? `<p class="tl-focus"><span>focus</span>${escapeHtml(entry.focusAreas)}</p>`
      : ""
  ].join("");
}

function renderPanelEntry(entry: TimelineEntry, now: Date, isActive: boolean): string {
  const details = renderDetails(entry);
  return `
    <article class="tl-entry ${isActive ? "is-active" : ""}" data-tl-entry="${escapeHtml(entry.id)}">
      <h3 class="tl-entry__role">${escapeHtml(entry.role)}</h3>
      <p class="tl-entry__org">${escapeHtml(entry.organization)} · ${escapeHtml(entry.location)}</p>
      <p class="tl-entry__meta">
        <span class="tl-entry__track ${trackClass(entry.track)}">${escapeHtml(trackLabel(entry.track))}</span>
        <span class="tl-entry__date">${escapeHtml(formatRange(entry))}</span>
        <span>${escapeHtml(formatDuration(entry, now))}</span>
      </p>
      <p class="tl-entry__brief">${escapeHtml(entry.brief)}</p>
      ${
        details
          ? `
            <button type="button" class="tl-entry__toggle" data-tl-pin aria-expanded="false">
              <span class="tl-entry__chevron" aria-hidden="true"></span>
              <span>details</span>
              <span class="tl-entry__hint" data-tl-hint></span>
            </button>
            <div class="tl-entry__more"><div class="tl-entry__more-inner">${details}</div></div>
          `
          : ""
      }
    </article>
  `;
}

function renderTimeline(): string {
  const today = new Date();
  const graph = buildGraph();
  const { entries } = graph;
  // Start on the newest entry so initial state always matches scroll index 0.
  const firstId = entries[0]?.id;

  // The newest entry of each branch carries the branch name, like a ref.
  const tips = new Set(TRACKS.map((track) => entries.find((entry) => entry.track === track.id)?.id));
  const headTrack = graph.mergeRow >= 0 ? graph.trunk : (entries[0]?.track ?? graph.trunk);

  return `
    <section class="section" id="timeline" aria-labelledby="timeline-title">
      <div class="container">
        <h2 class="sr-only" id="timeline-title">Timeline</h2>
        <div class="gl-scroll" data-tl-scroll>
          <div class="gl-stage" data-tl-stage>
            ${renderPrompt("git log --graph --all")}
            <div class="gl" data-tl style="--lanes:${TRACKS.length}">
              <div class="gl-log" data-tl-list>
                <div class="gl-row gl-row--head" aria-hidden="true">
                  <span class="gl-graph">${line("down", headTrack, trackColumn(headTrack))}</span>
                  <span class="gl-head">now</span>
                </div>
                <ol class="gl-list" aria-label="Work and education, newest first">
                  ${entries
                    .map((entry, row) => {
                      const ref = tips.has(entry.id)
                        ? `<span class="gl-ref ${trackClass(entry.track)}">(${escapeHtml(trackLabel(entry.track))})</span>`
                        : "";
                      return renderCommit(entry, renderRowGraph(graph, row), ref, entry.id === firstId);
                    })
                    .join("")}
                </ol>
              </div>
              <div class="tl-panel" id="tl-panel" data-tl-panel>
                ${entries.map((entry) => renderPanelEntry(entry, today, entry.id === firstId)).join("")}
              </div>
            </div>
          </div>
          <div class="gl-spacer" aria-hidden="true"></div>
        </div>
      </div>
    </section>
  `;
}

/* ------------------------------------------------------------
   Projects: the first five in the data, laid out by how many there are
   ------------------------------------------------------------ */

const MAX_PROJECTS = 5;

function renderHighlight(): string {
  const project = PROJECT_HIGHLIGHT;
  if (!project.ready) return "";
  const points = project.points
    .slice(0, 3)
    .map((point) => `<li>${escapeHtml(point)}</li>`)
    .join("");
  return `
    <li class="project project--highlight">
      <a class="project__link" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">
        <div class="project__lead">
          <h3 class="project__name">${escapeHtml(project.name)}</h3>
          <p class="project__headline">${escapeHtml(project.headline)}</p>
        </div>
        <div class="project__rest">
          <p class="project__summary">${escapeHtml(project.summary)}</p>
          ${points ? `<ul class="dash-list project__points">${points}</ul>` : ""}
          <span class="project__meta">
            <span>${escapeHtml(project.language)}</span>
            <span class="project__open">${escapeHtml(project.linkLabel.toLowerCase())}</span>
          </span>
        </div>
      </a>
    </li>
  `;
}

function renderProjects(): string {
  const projects = PROJECTS.slice(0, MAX_PROJECTS);
  const highlight = renderHighlight();
  if (!projects.length && !highlight) return "";

  const cards = projects
    .map(
      (project) => `
        <li class="project">
          <a class="project__link" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">
            <h3 class="project__name">${escapeHtml(project.name)}</h3>
            <p class="project__headline">${escapeHtml(project.headline)}</p>
            <p class="project__summary">${escapeHtml(project.summary)}</p>
            <span class="project__meta">
              <span>${escapeHtml(project.language)}</span>
              <span class="project__open">${escapeHtml(project.linkLabel.toLowerCase())}</span>
            </span>
          </a>
        </li>
      `
    )
    .join("");

  return `
    <section class="section" id="projects" aria-labelledby="projects-title">
      <div class="container">
        <h2 class="sr-only" id="projects-title">Projects</h2>
        ${renderPrompt("ls projects")}
        <ul class="projects" data-count="${projects.length}">${highlight}${cards}</ul>
      </div>
    </section>
  `;
}

export function renderHomePage(): string {
  return `${renderWhoami()}${renderTimeline()}${renderProjects()}`;
}

/* ------------------------------------------------------------
   Behavior
   ------------------------------------------------------------ */

const HOVER_INTENT_MS = 110;
const SCROLL_HOVER_COOLDOWN_MS = 280;
/* Equal scroll distance per entry while the timeline stage is pinned. */
const SCROLL_STEP_PX = 160;
const MIN_STAGE_BREATHING_PX = 24;
let hasTypedIntro = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function typeIntro(root: HTMLElement): void {
  const typed = root.querySelector<HTMLElement>("[data-typed]");
  if (!typed) return;
  if (hasTypedIntro || prefersReducedMotion()) return;
  hasTypedIntro = true;

  const full = typed.textContent ?? "";
  let i = 0;
  typed.textContent = "";
  const timer = window.setInterval(() => {
    i += 1;
    typed.textContent = full.slice(0, i);
    if (i >= full.length) window.clearInterval(timer);
  }, 70);
}

export function bindHomePage(root: HTMLElement): () => void {
  typeIntro(root);

  const scrollEl = root.querySelector<HTMLElement>("[data-tl-scroll]");
  const stageEl = root.querySelector<HTMLElement>("[data-tl-stage]");
  const tlEl = root.querySelector<HTMLElement>("[data-tl]");
  const listEl = root.querySelector<HTMLElement>("[data-tl-list]");
  const panelEl = root.querySelector<HTMLElement>("[data-tl-panel]");
  if (!scrollEl || !stageEl || !tlEl || !listEl || !panelEl) {
    return () => {};
  }

  const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-tl-row]"));
  const items = Array.from(listEl.querySelectorAll<HTMLButtonElement>("[data-tl-item]"));
  const entries = Array.from(panelEl.querySelectorAll<HTMLElement>("[data-tl-entry]"));
  const canHover = window.matchMedia("(hover: hover)");
  /* Narrow layout: the panel opens inside the selected row. */
  const stacked = window.matchMedia("(max-width: 860px)");
  /* Hover only previews where the rows cannot move under the pointer. */
  const hoverMode = (): boolean => canHover.matches && !stacked.matches;

  let activeId = (items.find((item) => item.classList.contains("is-active")) ?? items[0])?.dataset.tlItem ?? "";
  let pinned = false;
  let hoverPreviewId: string | null = null;
  let intentTimer: number | undefined;
  let scrolly = false;
  let glTop = 0;
  let travel = 0;
  let lastScrollAt = 0;
  let rafId: number | null = null;
  let destroyed = false;

  const placePanel = (): void => {
    const home = stacked.matches
      ? rows.find((row) => row.dataset.tlRow === activeId)?.querySelector<HTMLElement>(".gl-body")
      : tlEl;
    if (home && panelEl.parentElement !== home) home.appendChild(panelEl);
  };

  const sync = (): void => {
    for (const row of rows) row.classList.toggle("is-active", row.dataset.tlRow === activeId);
    for (const item of items) {
      const isActive = item.dataset.tlItem === activeId;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-expanded", String(isActive && stacked.matches));
      if (isActive) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    }
    const hint = hoverMode()
      ? pinned
        ? "pinned · esc to unpin"
        : "hover, or click to pin"
      : pinned
        ? "tap to fold"
        : "tap to unfold";
    for (const entry of entries) {
      entry.classList.toggle("is-active", entry.dataset.tlEntry === activeId);
      entry.querySelector("[data-tl-pin]")?.setAttribute("aria-expanded", String(pinned));
      const hintEl = entry.querySelector("[data-tl-hint]");
      if (hintEl) hintEl.textContent = hint;
    }
    panelEl.classList.toggle("is-pinned", pinned && !scrolly);
    placePanel();
  };

  /* Symmetric, equal-bucket scroll-to-index mapping:
     bucket k covers [k * step, (k + 1) * step) for every entry including
     first and last, so scrolling down and scrolling up behave identically. */
  const scrollMetrics = (): { scrolled: number; progress: number; index: number } => {
    if (travel <= 0 || !items.length) {
      return { scrolled: 0, progress: 0, index: 0 };
    }
    const scrolled = glTop - scrollEl.getBoundingClientRect().top;
    const progress = Math.min(Math.max(scrolled / travel, 0), 1);
    if (scrolled <= 0) return { scrolled, progress: 0, index: 0 };
    if (scrolled >= travel) return { scrolled, progress: 1, index: items.length - 1 };
    const index = Math.min(Math.floor((scrolled / travel) * items.length), items.length - 1);
    return { scrolled, progress, index };
  };

  const syncFromScroll = (): void => {
    if (!scrolly) return;
    const { progress, index } = scrollMetrics();
    scrollEl.style.setProperty("--gl-progress", progress.toFixed(4));
    const nextId = items[index]?.dataset.tlItem ?? activeId;
    hoverPreviewId = null;
    if (nextId !== activeId) {
      activeId = nextId;
      sync();
    }
  };

  const scrollToCommit = (index: number): void => {
    if (!scrolly || travel <= 0 || !items.length) return;
    const docTop = scrollEl.getBoundingClientRect().top + window.scrollY;
    const step = travel / items.length;
    const targetY = Math.max(0, Math.round(docTop - glTop + (index + 0.5) * step));
    const behavior: ScrollBehavior = prefersReducedMotion() ? "instant" : "smooth";
    window.scrollTo({ top: targetY, behavior });
  };

  /* In the narrow layout the panel moving between rows shifts the page;
     keep the row that was tapped where it was. */
  const keepInPlace = (anchor: HTMLElement, change: () => void): void => {
    const before = anchor.getBoundingClientRect().top;
    change();
    const shift = anchor.getBoundingClientRect().top - before;
    if (stacked.matches && shift) window.scrollBy({ top: shift, behavior: "instant" });
  };

  const measure = (): void => {
    if (destroyed) return;
    placePanel();

    const header = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
    const eligible = !stacked.matches && items.length > 1;

    let nextScrolly = false;
    let nextGlTop = header + 24;
    let nextTravel = 0;

    if (eligible) {
      // Measure the full stage with scrolly layout applied (all details expanded
      // in grid-area 1/1) so stage height stays invariant across all commits.
      const hadScrolly = scrollEl.classList.contains("is-scrolly");
      if (!hadScrolly) scrollEl.classList.add("is-scrolly");
      const stageHeight = stageEl.offsetHeight;
      const room = window.innerHeight - header - stageHeight;
      if (room >= MIN_STAGE_BREATHING_PX) {
        nextScrolly = true;
        nextGlTop = Math.round(header + Math.min(48, room / 2));
        nextTravel = items.length * SCROLL_STEP_PX;
      } else if (!hadScrolly) {
        scrollEl.classList.remove("is-scrolly");
      }
    }

    scrolly = nextScrolly;
    glTop = nextGlTop;
    travel = nextTravel;

    scrollEl.classList.toggle("is-scrolly", scrolly);
    if (scrolly) {
      pinned = false;
      scrollEl.style.setProperty("--gl-top", `${glTop}px`);
      scrollEl.style.setProperty("--gl-travel", `${travel}px`);
      scrollEl.dataset.glTop = String(glTop);
      syncFromScroll();
    } else {
      scrollEl.style.removeProperty("--gl-top");
      scrollEl.style.removeProperty("--gl-travel");
      scrollEl.style.removeProperty("--gl-progress");
      delete scrollEl.dataset.glTop;
    }
    sync();
  };

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const id = item.dataset.tlItem ?? "";
    const row = item.closest<HTMLElement>("[data-tl-row]") ?? item;

    row.addEventListener("mouseenter", () => {
      if (!hoverMode()) return;
      if (scrolly) {
        // Ignore accidental cursor contact while the user is actively scrolling.
        if (performance.now() - lastScrollAt < SCROLL_HOVER_COOLDOWN_MS) return;
        window.clearTimeout(intentTimer);
        intentTimer = window.setTimeout(() => {
          if (performance.now() - lastScrollAt < SCROLL_HOVER_COOLDOWN_MS) return;
          hoverPreviewId = id;
          if (activeId !== id) {
            activeId = id;
            sync();
          }
        }, HOVER_INTENT_MS);
        return;
      }
      if (pinned) return;
      window.clearTimeout(intentTimer);
      intentTimer = window.setTimeout(() => {
        activeId = id;
        sync();
      }, HOVER_INTENT_MS);
    });

    row.addEventListener("mouseleave", () => {
      window.clearTimeout(intentTimer);
    });

    item.addEventListener("focus", () => {
      if (scrolly) {
        if (id !== activeId) {
          activeId = id;
          sync();
        }
        return;
      }
      if (!stacked.matches && !pinned && id !== activeId) {
        activeId = id;
        sync();
      }
    });

    item.addEventListener("click", () => {
      window.clearTimeout(intentTimer);
      if (scrolly) {
        hoverPreviewId = null;
        activeId = id;
        sync();
        scrollToCommit(i);
        return;
      }
      keepInPlace(item, () => {
        if (hoverMode()) {
          // Non-scrolly desktop: click pins or unpins the entry.
          pinned = id === activeId ? !pinned : true;
        } else {
          // Touch or narrow: first tap selects, second tap unfolds details.
          pinned = id === activeId ? !pinned : false;
        }
        activeId = id;
        sync();
      });
    });
  }

  // When pointer leaves the commit list in scrolly mode, return smoothly
  // to the entry matching the current scroll position.
  listEl.addEventListener("mouseleave", () => {
    window.clearTimeout(intentTimer);
    if (scrolly && hoverPreviewId !== null) {
      syncFromScroll();
    }
  });

  panelEl.addEventListener("click", (event) => {
    if (scrolly) return;
    if (!(event.target as HTMLElement).closest("[data-tl-pin]")) return;
    pinned = !pinned;
    sync();
  });

  tlEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pinned) {
      pinned = false;
      sync();
    }
  });

  const onScroll = (): void => {
    if (destroyed || !scrollEl.isConnected) return;
    lastScrollAt = performance.now();
    window.clearTimeout(intentTimer);
    if (!scrolly) return;
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      if (destroyed) return;
      syncFromScroll();
    });
  };

  const onResize = (): void => {
    measure();
  };

  const onStackedChange = (): void => {
    sync();
    measure();
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      if (!destroyed) measure();
    });
    resizeObserver.observe(listEl);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  stacked.addEventListener("change", onStackedChange);

  sync();
  measure();

  document.fonts?.ready.then(() => {
    if (!destroyed) measure();
  });

  return () => {
    destroyed = true;
    window.clearTimeout(intentTimer);
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    stacked.removeEventListener("change", onStackedChange);
    resizeObserver?.disconnect();
  };
}
