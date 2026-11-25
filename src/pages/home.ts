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

   Desktop shows a two-column master–detail view with full details
   always visible. Narrow screens open the active entry inline under
   its commit row with the rails continuing alongside.
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

const HEAD_ID = "head";

function renderRefHtml(branch: string | null, isActive: boolean, isHead = false): string {
  if (isHead) {
    return isActive ? `(<span class="gl-ref__head">HEAD</span>)` : "";
  }
  if (isActive && branch) {
    return `(<span class="gl-ref__head">HEAD</span><span class="gl-ref__sep"> -&gt; </span>${escapeHtml(branch)})`;
  }
  if (isActive) {
    return `(<span class="gl-ref__head">detached HEAD</span>)`;
  }
  if (branch) {
    return `(${escapeHtml(branch)})`;
  }
  return "";
}

function renderHeadRow(headTrack: TimelineTrack, isActive: boolean): string {
  const refHtml = renderRefHtml(null, isActive, true);
  const col = trackColumn(headTrack);
  return `
    <div class="gl-row gl-row--head ${isActive ? "is-active" : ""}" data-tl-row="${HEAD_ID}">
      <span class="gl-graph" aria-hidden="true">
        ${line("down", headTrack, col)}
        <i class="gl-node gl-node--head ${trackClass(headTrack)}" style="--col:${col}"></i>
      </span>
      <div class="gl-body">
        <button
          type="button"
          class="gl-commit gl-commit--head ${isActive ? "is-active" : ""}"
          data-tl-item="${HEAD_ID}"
          aria-controls="tl-panel"
        >
          <span class="gl-head">now</span>
          <span class="gl-ref ${trackClass(headTrack)}" data-tl-ref data-tl-head="true" ${refHtml ? "" : "hidden"}>${refHtml}</span>
          <span class="gl-commit__hint" aria-hidden="true">summary</span>
        </button>
      </div>
    </div>
  `;
}

function renderCommit(entry: TimelineEntry, graph: string, branch: string | null, isActive: boolean): string {
  const refHtml = renderRefHtml(branch, isActive);
  const detached = isActive && !branch;
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
            <span
              class="gl-ref ${trackClass(entry.track)} ${detached ? "is-detached" : ""}"
              data-tl-ref
              data-tl-branch="${branch ? escapeHtml(branch) : ""}"
              ${refHtml ? "" : "hidden"}
            >${refHtml}</span>
            <span class="gl-commit__hint" aria-hidden="true">show</span>
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

function renderSummaryPanel(entries: TimelineEntry[], isActive: boolean): string {
  const earliestYear = entries.length ? parseMonth(entries[entries.length - 1].start).year : "";
  const workCount = entries.filter((entry) => entry.track === "experience").length;
  const eduCount = entries.filter((entry) => entry.track === "education").length;
  const summaryItems = entries
    .map(
      (entry) => `
        <li>
          <button
            type="button"
            class="tl-summary-item ${trackClass(entry.track)}"
            data-tl-jump="${escapeHtml(entry.id)}"
          >
            <span class="tl-summary-item__head">
              <span class="tl-summary-item__role">${escapeHtml(entry.role)}</span>
              <span class="tl-summary-item__date">${escapeHtml(entry.period)}</span>
            </span>
            <span class="tl-summary-item__brief">${escapeHtml(entry.brief)}</span>
          </button>
        </li>
      `
    )
    .join("");

  return `
    <article class="tl-entry tl-entry--summary ${isActive ? "is-active" : ""}" data-tl-entry="${HEAD_ID}">
      <h3 class="tl-entry__role">Summary</h3>
      <p class="tl-entry__meta">
        <span class="gl-ref__head">HEAD</span>
        ${earliestYear ? `<span>${earliestYear}–now</span>` : ""}
        <span class="tl-entry__track is-work">${workCount} work</span>
        <span class="tl-entry__track is-edu">${eduCount} education</span>
      </p>
      <ul class="tl-summary-list" aria-label="Summary of timeline entries">${summaryItems}</ul>
    </article>
  `;
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
      ${details ? `<div class="tl-entry__more"><div class="tl-entry__more-inner">${details}</div></div>` : ""}
    </article>
  `;
}

function renderTimeline(): string {
  const today = new Date();
  const graph = buildGraph();
  const { entries } = graph;

  // The newest entry of each branch carries the branch name, like a ref.
  const tips = new Set(TRACKS.map((track) => entries.find((entry) => entry.track === track.id)?.id));
  const headTrack = graph.mergeRow >= 0 ? graph.trunk : (entries[0]?.track ?? graph.trunk);

  return `
    <section class="section" id="timeline" aria-labelledby="timeline-title">
      <div class="container">
        <h2 class="sr-only" id="timeline-title">Timeline</h2>
        ${renderPrompt("git log --graph --all", { comment: "click a commit to move HEAD" })}
        <div class="gl" data-tl style="--lanes:${TRACKS.length}">
          <div class="gl-log" data-tl-list>
            ${renderHeadRow(headTrack, true)}
            <ol class="gl-list" aria-label="Work and education, newest first">
              ${entries
                .map((entry, row) => {
                  const branch = tips.has(entry.id) ? trackLabel(entry.track) : null;
                  return renderCommit(entry, renderRowGraph(graph, row), branch, false);
                })
                .join("")}
            </ol>
          </div>
          <div class="tl-panel" id="tl-panel" data-tl-panel>
            ${renderSummaryPanel(entries, true)}
            ${entries.map((entry) => renderPanelEntry(entry, today, false)).join("")}
          </div>
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

  const tlEl = root.querySelector<HTMLElement>("[data-tl]");
  const listEl = root.querySelector<HTMLElement>("[data-tl-list]");
  const panelEl = root.querySelector<HTMLElement>("[data-tl-panel]");
  if (!tlEl || !listEl || !panelEl) {
    return () => {};
  }

  const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-tl-row]"));
  const items = Array.from(listEl.querySelectorAll<HTMLButtonElement>("[data-tl-item]"));
  const entries = Array.from(panelEl.querySelectorAll<HTMLElement>("[data-tl-entry]"));
  /* Narrow layout: the panel opens inside the selected row. */
  const stacked = window.matchMedia("(max-width: 860px)");

  const defaultId = HEAD_ID;
  let activeId = stacked.matches ? "" : defaultId;

  const placePanel = (): void => {
    if (stacked.matches) {
      const home =
        activeId && activeId !== HEAD_ID
          ? rows.find((row) => row.dataset.tlRow === activeId)?.querySelector<HTMLElement>(".gl-body")
          : null;
      panelEl.hidden = !home;
      if (home && panelEl.parentElement !== home) home.appendChild(panelEl);
      return;
    }
    panelEl.hidden = false;
    if (panelEl.parentElement !== tlEl) tlEl.appendChild(panelEl);
  };

  const sync = (): void => {
    if (stacked.matches && activeId === HEAD_ID) activeId = "";
    if (!stacked.matches && !activeId) activeId = defaultId;

    for (const row of rows) row.classList.toggle("is-active", row.dataset.tlRow === activeId);
    for (const item of items) {
      const isHead = item.dataset.tlItem === HEAD_ID;
      const isActive = item.dataset.tlItem === activeId;
      item.classList.toggle("is-active", isActive);
      item.disabled = isHead && stacked.matches;
      item.setAttribute("aria-expanded", String(isActive && stacked.matches));
      if (isActive) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");

      const refEl = item.querySelector<HTMLElement>("[data-tl-ref]");
      if (refEl) {
        const branch = refEl.dataset.tlBranch || null;
        const html = renderRefHtml(branch, isActive, isHead);
        refEl.innerHTML = html;
        refEl.hidden = !html;
        refEl.classList.toggle("is-detached", isActive && !branch && !isHead);
      }
    }
    for (const entry of entries) {
      entry.classList.toggle("is-active", entry.dataset.tlEntry === activeId);
    }
    placePanel();
  };

  /* In the narrow layout the panel moving between rows shifts the page;
     keep the row that was tapped where it was. */
  const keepInPlace = (anchor: HTMLElement, change: () => void): void => {
    const before = anchor.getBoundingClientRect().top;
    change();
    const shift = anchor.getBoundingClientRect().top - before;
    if (stacked.matches && shift) window.scrollBy({ top: shift, behavior: "instant" });
  };

  const navItems = (): HTMLButtonElement[] =>
    stacked.matches ? items.filter((item) => item.dataset.tlItem !== HEAD_ID) : items;

  const selectByIndex = (list: HTMLButtonElement[], index: number, focus = false): void => {
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    const item = list[clamped];
    if (!item) return;
    const id = item.dataset.tlItem ?? "";
    if (id !== activeId) {
      keepInPlace(item, () => {
        activeId = id;
        sync();
      });
    }
    if (focus) item.focus();
  };

  for (const item of items) {
    const id = item.dataset.tlItem ?? "";

    item.addEventListener("click", () => {
      if (stacked.matches && id === HEAD_ID) return;
      keepInPlace(item, () => {
        activeId = stacked.matches && activeId === id ? "" : id;
        sync();
      });
    });

    item.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const list = navItems();
      const idx = list.indexOf(item);
      if (idx < 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectByIndex(list, idx + 1, true);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectByIndex(list, idx - 1, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectByIndex(list, 0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        selectByIndex(list, list.length - 1, true);
      }
    });
  }

  panelEl.addEventListener("click", (event) => {
    const jump = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-tl-jump]");
    const targetId = jump?.dataset.tlJump;
    if (!targetId) return;
    activeId = targetId;
    sync();
  });

  const onStackedChange = (): void => {
    sync();
  };

  stacked.addEventListener("change", onStackedChange);
  sync();

  return () => {
    stacked.removeEventListener("change", onStackedChange);
  };
}
