/* raphaelluethy.ch — terminal window behavior.

   The page is a two-view terminal: home runs `whoami`, projects runs
   `ls -la projects`. Navigating between them mirrors a real shell:
     1. flush   — the current output fades out
     2. retype  — the new command is typed character by character
     3. reveal  — the new output fades in
   The active view is mirrored to the URL hash so refresh, deep-links,
   and the browser Back button all work. `prefers-reduced-motion` skips
   the typing and fades. */

const VIEWS = ["home", "projects"] as const;
type View = (typeof VIEWS)[number];

const COMMANDS: Record<View, string> = {
  home: "whoami",
  projects: "ls -la projects",
};

const TYPE_INTERVAL = 45; // ms per typed character
const REVEAL_DELAY = 140; // ms after typing before the output appears
const FLUSH_DELAY = 190; // ms the old output fades before the swap

function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value);
}

const output = document.querySelector<HTMLElement>("[data-output]");
const typed = document.querySelector<HTMLElement>("[data-typed]");
const views = new Map<View, HTMLElement>();
for (const el of document.querySelectorAll<HTMLElement>("[data-view]")) {
  const name = el.dataset.view;
  if (name && isView(name)) views.set(name, el);
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

let current: View = "home";
let cmdTimer: number | undefined;
let flushTimer: number | undefined;
let revealTimer: number | undefined;

function setOutputVisible(visible: boolean): void {
  if (output) output.style.opacity = visible ? "1" : "0";
}

function showView(next: View): void {
  for (const [name, el] of views) el.hidden = name !== next;
}

/** Type the command for `next`, then reveal its output. */
function typeCommand(next: View): void {
  const full = COMMANDS[next];
  window.clearInterval(cmdTimer);
  if (!typed) return;

  if (prefersReducedMotion()) {
    typed.textContent = full;
    setOutputVisible(true);
    return;
  }

  let i = 0;
  typed.textContent = "";
  cmdTimer = window.setInterval(() => {
    i += 1;
    typed.textContent = full.slice(0, i);
    if (i >= full.length) {
      window.clearInterval(cmdTimer);
      revealTimer = window.setTimeout(() => setOutputVisible(true), REVEAL_DELAY);
    }
  }, TYPE_INTERVAL);
}

/** Flush the current output, swap to `next`, then retype + reveal. */
function navigate(next: View): void {
  if (next === current) return;
  window.clearTimeout(flushTimer);
  window.clearTimeout(revealTimer);
  setOutputVisible(false);

  const swap = (): void => {
    current = next;
    showView(next);
    if (typed) typed.textContent = "";
    typeCommand(next);
  };

  if (prefersReducedMotion()) swap();
  else flushTimer = window.setTimeout(swap, FLUSH_DELAY);
}

function viewFromHash(): View {
  const value = location.hash.replace(/^#\/?/, "");
  return isView(value) ? value : "home";
}

// The run / back buttons drive navigation through the URL hash, so a
// single hashchange handler is the one place that swaps views.
for (const button of document.querySelectorAll<HTMLElement>("[data-nav]")) {
  button.addEventListener("click", () => {
    const target = button.dataset.nav;
    if (target && isView(target)) location.hash = `#/${target}`;
  });
}

window.addEventListener("hashchange", () => navigate(viewFromHash()));

// Boot: honor a deep-linked view, then run its command on top.
current = viewFromHash();
showView(current);
setOutputVisible(true);
typeCommand(current);
