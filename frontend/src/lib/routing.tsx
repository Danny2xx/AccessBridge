import { createContext, useContext, type ReactNode } from "react";
import type { EvidenceResponse } from "@/types";

export type Routing = EvidenceResponse["routing"];

const RoutingContext = createContext<Routing | null>(null);

export function RoutingProvider({ routing, children }: { routing: Routing; children: ReactNode }) {
  return <RoutingContext.Provider value={routing}>{children}</RoutingContext.Provider>;
}

/** How the active travel-time matrix was made, for copy that must stay honest. */
export function useRouting(): Routing | null {
  return useContext(RoutingContext);
}

export function isRoutedOnStreets(routing: Routing | null | undefined): boolean {
  return routing?.source_mode === "r5_input";
}

export function includesTransit(routing: Routing | null | undefined): boolean {
  return isRoutedOnStreets(routing) && routing?.routing_profile === "walk_transit";
}
