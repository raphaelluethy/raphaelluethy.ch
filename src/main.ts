/* raphaelluethy.ch — client behavior.
   Two small pieces of interactivity carried over from the design:
   1. Navbar routing between the Home / Projects / Contact screens,
      backed by the URL hash so deep-links, refresh, and the browser
      Back button all work.
   2. The contact form's "message sent" terminal confirmation. */

const ROUTES = ["home", "projects", "contact"] as const;
type Route = (typeof ROUTES)[number];

function isRoute(value: string | undefined): value is Route {
  return value !== undefined && (ROUTES as readonly string[]).includes(value);
}

const navButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".nav-item[data-nav]"),
);
const screens = Array.from(
  document.querySelectorAll<HTMLElement>(".screen[data-route]"),
);

function show(route: Route): void {
  for (const screen of screens) {
    screen.hidden = screen.dataset.route !== route;
  }
  for (const button of navButtons) {
    button.setAttribute(
      "aria-current",
      button.dataset.nav === route ? "true" : "false",
    );
  }
}

function routeFromHash(): Route {
  const value = location.hash.replace(/^#\/?/, "");
  return isRoute(value) ? value : "home";
}

for (const button of navButtons) {
  button.addEventListener("click", () => {
    const route = button.dataset.nav;
    if (isRoute(route)) location.hash = `#/${route}`;
  });
}

window.addEventListener("hashchange", () => show(routeFromHash()));
show(routeFromHash()); // restore the screen named in the URL on load

// Contact form → terminal-style confirmation. The form is reset (not
// destroyed) so a second message can be sent without reloading.
const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  form.reset();

  let confirmation = form.parentElement?.querySelector<HTMLElement>(
    ".prompt[data-sent]",
  );
  if (!confirmation) {
    confirmation = document.createElement("div");
    confirmation.className = "prompt";
    confirmation.dataset.sent = "";
    confirmation.innerHTML =
      '<span class="prompt__symbol" aria-hidden="true">$</span>' +
      '<span class="prompt__body">message sent — talk soon.' +
      '<span class="prompt__caret"></span></span>';
    form.insertAdjacentElement("afterend", confirmation);
  }
});
