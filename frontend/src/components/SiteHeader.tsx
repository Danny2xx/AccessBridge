import type { Route } from "../lib/useHashRoute";

const NAV: Array<{ route: Route; label: string }> = [
  { route: "story", label: "The Story" },
  { route: "explore", label: "Explore" },
  { route: "evidence", label: "The Evidence" },
  { route: "how-it-works", label: "How it works" }
];

type SiteHeaderProps = {
  route: Route;
  progress?: number | null;
};

export function SiteHeader({ route, progress = null }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <a className="brand" href="#/story" aria-label="AccessBridge AI, back to the story">
        <span className="brand-name">AccessBridge AI</span>
        <span className="brand-sub">The Innovation Spine · Phase 2</span>
      </a>
      <nav className="site-nav" aria-label="Sections">
        <ul>
          {NAV.map((item) => (
            <li key={item.route}>
              <a href={`#/${item.route}`} aria-current={route === item.route ? "page" : undefined}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="ask-link" href="#/ask" aria-current={route === "ask" ? "page" : undefined}>
        The Ask
      </a>
      {progress !== null ? (
        <span className="header-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      ) : null}
    </header>
  );
}
