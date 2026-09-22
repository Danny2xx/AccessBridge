/**
 * Innovation Spine framing. Budget levels come from the UKREiiF challenge brief
 * (£1m, £10m, unlimited); phase names and contents from the Innovation Spine deck.
 */

export const SPINELENS_URL = "https://spinelens-ai.pages.dev";
export const PHASE_2_BUDGET_GBP = 10_000_000;

export type Phase = {
  id: string;
  number: number;
  budget: string;
  name: string;
  summary: string;
  current?: boolean;
  link?: { href: string; label: string };
};

export const PHASES: Phase[] = [
  {
    id: "phase-1",
    number: 1,
    budget: "£1m",
    name: "Make it visible",
    summary:
      "Wayfinders, a safer crossing and a gateway pavilion make the walk from the city centre to the Knowledge Quarter easy to find and follow.",
    link: { href: SPINELENS_URL, label: "See Phase 1 in SpineLens AI" }
  },
  {
    id: "phase-2",
    number: 2,
    budget: "£10m",
    name: "Make it usable",
    summary:
      "Jennens Road becomes a people-first street, and a Mobility Loop with redesigned stops makes everyday trips work. AccessBridge shows where those stops would help most.",
    current: true
  },
  {
    id: "phase-3",
    number: 3,
    budget: "Unlimited",
    name: "Make it investable",
    summary:
      "Long-term growth of public transport, cycling and walking routes across the city, carrying the Knowledge Quarter's identity with it."
  }
];

export const BKQ_MARKER = {
  id: "bkq",
  longitude: -1.8884,
  latitude: 52.4849,
  label: "Birmingham Knowledge Quarter"
};

export const NEIGHBOURS = "Nechells, Aston, Saltley and Small Heath";
