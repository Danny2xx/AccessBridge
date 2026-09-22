import { useCallback, useEffect, useState } from "react";

export type Route = "story" | "explore" | "evidence" | "how-it-works" | "ask";

export const ROUTES: Route[] = ["story", "explore", "evidence", "how-it-works", "ask"];

function parseHash(hash: string): Route {
  const candidate = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return (ROUTES as string[]).includes(candidate) ? (candidate as Route) : "story";
}

export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (parseHash(window.location.hash) === next) return;
    window.location.hash = `/${next}`;
  }, []);

  return [route, navigate];
}
