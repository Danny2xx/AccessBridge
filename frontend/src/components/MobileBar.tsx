import { Menu } from "lucide-react";
import { useState } from "react";
import { AppSidebarLinks } from "@/components/AppSidebarLinks";
import { BrandMark } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Route } from "@/lib/useHashRoute";

export function MobileBar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
      <a
        href="#/story"
        className="flex items-center gap-2.5 no-underline"
        aria-label="AccessBridge AI, back to the story"
      >
        <BrandMark className="size-8" />
        <span className="text-[0.95rem] font-semibold tracking-tight text-foreground">AccessBridge AI</span>
      </a>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the section menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Sections</SheetTitle>
            </SheetHeader>
            <AppSidebarLinks route={route} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
