import { NAV } from "@/components/AppSidebar";
import type { Route } from "@/lib/useHashRoute";
import { cn } from "@/lib/utils";

/** The same sections as the sidebar, for the phone menu. */
export function AppSidebarLinks({ route, onNavigate }: { route: Route; onNavigate: () => void }) {
  return (
    <ul className="grid gap-1 px-4">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = route === item.route;
        return (
          <li key={item.route}>
            <a
              href={`#/${item.route}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 font-medium no-underline",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("size-[1.125rem]", active && "text-primary")} aria-hidden="true" />
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
