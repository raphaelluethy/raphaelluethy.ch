export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month, day));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

/* A shell prompt line. Every section of the site is headed by the command
   that "produced" it, so the terminal metaphor carries the structure
   instead of sitting in a box of its own. */
export function renderPrompt(
  command: string,
  options: { cursor?: boolean; typed?: boolean } = {}
): string {
  return `
    <div class="prompt" aria-hidden="true">
      <span class="prompt__host">raphael@luethy</span>
      <span class="prompt__path">~ %</span>
      <span class="prompt__cmd"${options.typed ? " data-typed" : ""}>${escapeHtml(command)}</span>${
        options.cursor || options.typed ? `<span class="prompt__cursor"></span>` : ""
      }
    </div>
  `;
}
