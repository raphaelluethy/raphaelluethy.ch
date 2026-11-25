const LINE_STEP_PX = 80;
const GG_TIMEOUT_MS = 500;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/* Global Vim navigation keymaps (non-invasive fallback):
   h / j / k / l   — scroll left / down / up / right
   Ctrl+d / Ctrl+u — half-page down / up
   gg / G          — top / bottom of page

   Runs in the bubble phase without calling preventDefault(), so browser
   keymaps and extensions (Vimium, Surfingkeys, Tridactyl, etc.) always
   take precedence first. */
export function bindVimKeymaps(): () => void {
  let pendingG = false;
  let pendingGTimer: number | undefined;

  const clearPendingG = (): void => {
    pendingG = false;
    window.clearTimeout(pendingGTimer);
  };

  const scrollBehavior = (repeat: boolean): ScrollBehavior =>
    prefersReducedMotion() || repeat ? "instant" : "smooth";

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const key = event.key;

    if (event.ctrlKey) {
      clearPendingG();
      const lower = key.toLowerCase();
      if (lower === "d") {
        window.scrollBy({
          top: Math.round(window.innerHeight * 0.5),
          behavior: scrollBehavior(event.repeat)
        });
      } else if (lower === "u") {
        window.scrollBy({
          top: -Math.round(window.innerHeight * 0.5),
          behavior: scrollBehavior(event.repeat)
        });
      }
      return;
    }

    if (key === "g") {
      if (pendingG) {
        clearPendingG();
        window.scrollTo({ top: 0, behavior: scrollBehavior(false) });
      } else {
        pendingG = true;
        window.clearTimeout(pendingGTimer);
        pendingGTimer = window.setTimeout(clearPendingG, GG_TIMEOUT_MS);
      }
      return;
    }

    clearPendingG();

    if (key === "G") {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: scrollBehavior(false)
      });
    } else if (key === "j") {
      window.scrollBy({ top: LINE_STEP_PX, behavior: scrollBehavior(event.repeat) });
    } else if (key === "k") {
      window.scrollBy({ top: -LINE_STEP_PX, behavior: scrollBehavior(event.repeat) });
    } else if (key === "h") {
      window.scrollBy({ left: -LINE_STEP_PX, behavior: scrollBehavior(event.repeat) });
    } else if (key === "l") {
      window.scrollBy({ left: LINE_STEP_PX, behavior: scrollBehavior(event.repeat) });
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    clearPendingG();
    window.removeEventListener("keydown", onKeyDown);
  };
}
