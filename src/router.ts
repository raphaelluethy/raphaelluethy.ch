export type HomeSection = "timeline" | "projects";

export type RouteMatch =
  | { page: "home"; section?: HomeSection }
  | { page: "blog"; slug?: string };

/* The profile is a single page. /cv and /projects stay valid URLs and
   simply land on the matching section of it. */
export function parseRoute(pathname: string): RouteMatch {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (clean === "cv") return { page: "home", section: "timeline" };
  if (clean === "projects") return { page: "home", section: "projects" };
  if (clean === "blog") return { page: "blog" };
  if (clean.startsWith("blog/")) {
    const slug = decodeURIComponent(clean.slice("blog/".length));
    return slug ? { page: "blog", slug } : { page: "blog" };
  }
  return { page: "home" };
}

export function navigateTo(path: string, onChange: () => void): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (window.location.pathname !== normalized) {
    window.history.pushState({}, "", normalized);
  }
  onChange();
}
