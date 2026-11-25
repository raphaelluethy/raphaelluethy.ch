export type TimelineTrack = "experience" | "education";

export interface ProjectItem {
  id: string;
  name: string;
  headline: string;
  summary: string;
  language: string;
  url: string;
  linkLabel: string;
}

export interface ProjectHighlight extends ProjectItem {
  ready: boolean;
  points: string[];
}

export interface TimelineEntry {
  id: string;
  /* Shown as text. */
  period: string;
  /* "YYYY-MM", used to place the entry on the time axis; end null = ongoing. */
  start: string;
  end: string | null;
  track: TimelineTrack;
  trackLabel: string;
  role: string;
  organization: string;
  /* Short form for the log rows; the panel shows `organization`. */
  orgShort?: string;
  /* Id of an entry on the other branch that this one belongs with: the
     two branches are drawn merging into one at this entry. */
  mergesWith?: string;
  location: string;
  brief: string;
  extendedIntro: string;
  highlights: string[];
  focusAreas: string;
}

export const SITE = {
  name: "Raphael Lüthy",
  domain: "raphaelluethy.ch",
  role: "Master's student & research assistant, IIT FHNW",
  location: "Windisch, Switzerland",
  nationality: "Swiss",
  languages: "German, English",
  institution: "Institute for Interactive Technologies (IIT), FHNW",
  summary:
    "I study computer science (MSE) and work as a research assistant at the Institute for Interactive Technologies, FHNW. Most of what I build is web-based, written in TypeScript, Go, and Java. On the side I run a lot of experiments with agents and keep exploring personal tooling.",
  stack: "TypeScript, Go, Java",
  links: {
    github: "https://github.com/raphaelluethy",
    linkedin: "https://www.linkedin.com/in/raphaelluethy/",
    x: "https://x.com/raphaelluethy",
    repo: "https://github.com/raphaelluethy/raphaelluethy.ch"
  }
} as const;

/* The highlight: one project shown large, above the others.
   It stays off the page until `ready` is true. To launch it: fill in the
   texts below, make sure the repo is public, and flip `ready`. */
export const PROJECT_HIGHLIGHT: ProjectHighlight = {
  ready: false,
  id: "respo",
  name: "respo",
  headline: "TODO: one line on what respo is",
  summary: "TODO: two or three sentences on what it does and why it exists.",
  /* Optional: up to three short facts, shown as a list. */
  points: [],
  language: "Java",
  url: "https://github.com/raphaelluethy/respo",
  linkLabel: "View on GitHub"
};

/* The profile shows these in order, up to five. */
export const PROJECTS: ProjectItem[] = [
  {
    id: "bngr",
    name: "bngr.ch",
    headline: "Custom search bangs for any engine",
    summary:
      "Routes shorthand commands like !gh or !mdn straight to the target site before a search query leaves your browser, while preserving your preferred default search engine.",
    language: "TypeScript",
    url: "https://bngr.ch",
    linkLabel: "Open bngr.ch"
  },
  {
    id: "heemac",
    name: "heemac",
    headline: "Directional window focus for macOS",
    summary:
      "Moves focus between windows with Hyper+Shift+H/J/K/L, vim-style. It only considers windows that are actually visible, and it is aware of Rex panes.",
    language: "Swift",
    url: "https://github.com/raphaelluethy/heemac",
    linkLabel: "View on GitHub"
  }
];

/* Timeline entries have a brief (always visible) and details (previewed,
   then unfolded on hover on desktop or tap on mobile). Content follows the
   LinkedIn profile; `extendedIntro`, `highlights` and `focusAreas` may be
   left empty. Experience and education are drawn as two parallel tracks on
   a shared time axis; any other track is listed underneath. */
export const CV_TIMELINE: TimelineEntry[] = [
  {
    id: "fhnw-iit",
    period: "2024 – now",
    start: "2024-03",
    end: null,
    track: "experience",
    trackLabel: "Experience",
    role: "Research Assistant",
    organization: "Institute for Interactive Technologies (IIT), FHNW",
    orgShort: "IIT, FHNW",
    location: "Brugg-Windisch, Switzerland",
    brief: "Part-time research assistant (Wissenschaftlicher Assistent): full-stack development on research projects, plus teaching.",
    extendedIntro: "Since March 2024, alongside the master's.",
    highlights: [
      "Work on research projects as a full-stack developer.",
      "Build internal tools and run the institute's internal servers.",
      "Supervise student projects and teach."
    ],
    focusAreas: "TypeScript, Go, Java"
  },
  {
    id: "fhnw-mse",
    mergesWith: "fhnw-iit",
    period: "2024 – 2027",
    start: "2024-09",
    end: "2027-08",
    track: "education",
    trackLabel: "Education",
    role: "MSc in Engineering (MSE), Computer Science",
    organization: "FHNW University of Applied Sciences and Arts Northwestern Switzerland",
    orgShort: "FHNW",
    location: "Brugg-Windisch, Switzerland",
    brief: "Master's degree in computer science, September 2024 to August 2027.",
    extendedIntro: "",
    highlights: [],
    focusAreas: ""
  },
  {
    id: "2assistu",
    period: "2021 – 2024",
    start: "2021-08",
    end: "2024-08",
    track: "experience",
    trackLabel: "Experience",
    role: "IT Project Manager",
    organization: "2assistU GmbH",
    orgShort: "2assistU GmbH",
    location: "Brugg, Switzerland",
    brief: "Part-time project manager for IT solutions, also looking after the internal IT infrastructure and the website.",
    extendedIntro: "Three years part-time, alongside the bachelor's.",
    highlights: [
      "IT Project Manager, November 2022 to August 2024: project management for IT solutions and the internal IT infrastructure.",
      "Junior IT Project Manager, August 2021 to November 2022: infrastructure, website, and project management for technical solutions."
    ],
    focusAreas: "TypeScript, CI/CD"
  },
  {
    id: "fhnw-bsc",
    period: "2020 – 2024",
    start: "2020-09",
    end: "2024-05",
    track: "education",
    trackLabel: "Education",
    role: "BSc in Computer Science",
    organization: "FHNW University of Applied Sciences and Arts Northwestern Switzerland",
    orgShort: "FHNW",
    location: "Brugg-Windisch, Switzerland",
    brief: "Bachelor's degree in computer science, specialization in web development.",
    extendedIntro: "September 2020 to May 2024. Final grade 5.0, thesis 5.3.",
    highlights: [],
    focusAreas: "Software design, software architecture, database design"
  },
  {
    id: "eth",
    period: "2019 – 2020",
    start: "2019-09",
    end: "2020-08",
    track: "education",
    trackLabel: "Education",
    role: "Studies at ETH Zürich",
    organization: "ETH Zürich",
    orgShort: "ETH Zürich",
    location: "Zürich, Switzerland",
    brief: "A year at ETH Zürich before moving to computer science at FHNW.",
    extendedIntro: "",
    highlights: [],
    focusAreas: ""
  },
  {
    id: "jacando",
    period: "2018 – 2021",
    start: "2018-07",
    end: "2021-08",
    track: "experience",
    trackLabel: "Experience",
    role: "Software Engineer (working student)",
    organization: "jacando AG",
    orgShort: "jacando AG",
    location: "Basel, Switzerland",
    brief: "Started as an intern and stayed on part-time as a software engineer, mostly on the backend.",
    extendedIntro: "",
    highlights: [
      "Working student, August 2019 to August 2021: part-time software engineer.",
      "Intern, July 2018 to August 2019: mainly backend work, some frontend and integration tasks."
    ],
    focusAreas: "TypeScript, CI/CD"
  }
];
