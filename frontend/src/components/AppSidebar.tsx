import { BarChart3, Map as MapIcon, Megaphone, Route, Workflow, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Route as RouteName } from "@/lib/useHashRoute";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

export const NAV: Array<{ route: RouteName; label: string; icon: LucideIcon }> = [
  { route: "story", label: "The Story", icon: Route },
  { route: "explore", label: "Explore", icon: MapIcon },
  { route: "evidence", label: "The Evidence", icon: BarChart3 },
  { route: "how-it-works", label: "How it works", icon: Workflow },
  { route: "ask", label: "The Ask", icon: Megaphone }
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md bg-primary", className)}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
        <path
          d="M4 17.5 L9.5 9 L14.5 14 L20 5.5"
          stroke="var(--primary-foreground)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="5.5" r="2.4" fill="var(--primary-foreground)" />
      </svg>
    </span>
  );
}

function NavItem({ item, active, compact }: { item: (typeof NAV)[number]; active: boolean; compact: boolean }) {
  const reduced = useReducedMotion();
  const Icon = item.icon;

  const link = (
    <a
      href={`#/${item.route}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors",
        compact && "justify-center px-0",
        active ? "text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {active ? (
        <motion.span
          layoutId={reduced ? undefined : "sidebar-active"}
          className="absolute inset-0 rounded-md bg-secondary"
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
        />
      ) : null}
      <Icon className={cn("relative z-10 size-[1.125rem]", active && "text-primary")} aria-hidden="true" />
      {compact ? (
        <span className="visually-hidden">{item.label}</span>
      ) : (
        <span className="relative z-10">{item.label}</span>
      )}
    </a>
  );

  if (!compact) return <li>{link}</li>;
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

export function AppSidebar({ route }: { route: RouteName }) {
  // Only one sidebar exists at a time, so the page has a single set of controls.
  const wide = useMediaQuery("(min-width: 1024px)");
  const medium = useMediaQuery("(min-width: 768px)");
  if (!medium) return null;
  const compact = !wide;

  return (
    <nav
      aria-label="Sections"
      data-testid={compact ? "sidebar-compact" : "sidebar"}
      className={cn(
        "sticky top-0 flex h-dvh flex-col border-r border-border bg-background",
        compact ? "w-[var(--sidebar-width-compact)]" : "w-[var(--sidebar-width)]"
      )}
    >
      <a
        href="#/story"
        className={cn("flex items-center gap-3 px-4 py-5 no-underline", compact && "justify-center px-0")}
        aria-label="AccessBridge AI, back to the story"
      >
        <BrandMark />
        {compact ? null : (
          <span className="grid leading-tight">
            <span className="text-[0.95rem] font-semibold tracking-tight text-foreground">AccessBridge AI</span>
            <span className="text-xs text-dim">Innovation Spine · Phase 2</span>
          </span>
        )}
      </a>

      <ul className={cn("grid gap-0.5 px-3", compact && "px-2")}>
        {NAV.map((item) => (
          <NavItem key={item.route} item={item} active={route === item.route} compact={compact} />
        ))}
      </ul>

      <div className={cn("mt-auto grid gap-3 px-3 pb-4", compact && "justify-items-center px-2")}>
        <ThemeToggle />
        {compact ? null : (
          <p className="px-3 text-xs leading-snug text-dim">
            A concept for the West Midlands @ UKREiiF challenge.
          </p>
        )}
      </div>
    </nav>
  );
}
