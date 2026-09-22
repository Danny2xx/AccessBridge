import { Menu } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Route } from "@/lib/useHashRoute";

const NAV: Array<{ route: Route; label: string }> = [
  { route: "story", label: "The Story" },
  { route: "explore", label: "Explore" },
  { route: "evidence", label: "The Evidence" },
  { route: "how-it-works", label: "How it works" }
];

function BrandMark() {
  return (
    <span className="grid size-9 place-items-center rounded-lg bg-primary/12 ring-1 ring-primary/30">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
        <path
          d="M4 17.5 L9.5 9 L14.5 14 L20 5.5"
          stroke="var(--primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="5.5" r="2.4" fill="var(--primary)" />
      </svg>
    </span>
  );
}

export function SiteHeader({ route, progress = null }: { route: Route; progress?: number | null }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <a
        href="#main"
        className="absolute top-2 left-3 z-50 -translate-y-20 rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-4 px-[clamp(1rem,3vw,2rem)]">
        <a href="#/story" className="flex items-center gap-3 no-underline" aria-label="AccessBridge AI, back to the story">
          <BrandMark />
          <span className="grid leading-tight">
            <span className="text-[1.05rem] font-extrabold tracking-tight">AccessBridge AI</span>
            <span className="text-xs text-dim max-lg:hidden">The Innovation Spine · Phase 2</span>
          </span>
        </a>

        <nav aria-label="Sections" className="mx-auto max-md:hidden">
          <ul className="flex items-center gap-1 rounded-full border border-border/80 bg-card/60 p-1.5">
            {NAV.map((item) => {
              const active = route === item.route;
              return (
                <li key={item.route}>
                  <a
                    href={`#/${item.route}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-4 py-1.5 text-sm font-semibold no-underline transition-colors",
                      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={reduced ? undefined : "nav-active"}
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 450, damping: 38 }}
                      />
                    ) : null}
                    <span className="relative z-10">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant={route === "ask" ? "default" : "outline"} className="rounded-full font-bold">
            <a href="#/ask" aria-current={route === "ask" ? "page" : undefined}>
              The Ask
            </a>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open the section menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Sections</SheetTitle>
              </SheetHeader>
              <nav aria-label="Sections">
                <ul className="grid gap-1 px-4">
                  {[...NAV, { route: "ask" as Route, label: "The Ask" }].map((item) => (
                    <li key={item.route}>
                      <SheetClose asChild>
                        <a
                          href={`#/${item.route}`}
                          aria-current={route === item.route ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2.5 font-semibold no-underline",
                            route === item.route
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </a>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {progress !== null ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[-1px] h-0.5 origin-left bg-primary"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : null}
    </header>
  );
}
