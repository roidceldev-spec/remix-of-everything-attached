import { Link, Outlet, useNavigate, useRouterState, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Library, ListChecks, MessageCircle } from "lucide-react";
import { useEffect, type ComponentType } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { SettingsMenu } from "@/components/account/SettingsMenu";
import { ChatButton } from "@/components/chat/ChatButton";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/coach/dashboard" | "/coach/programs" | "/coach/library" | "/coach/chat";
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/coach/programs", label: "Program Manager", icon: ListChecks },
  { to: "/coach/library", label: "Library", icon: Library },
  { to: "/coach/chat", label: "Messaging", icon: MessageCircle },
];

export function CoachShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { account, loading } = useAccount();

  const router = useRouter();

  useEffect(() => {
    if (!loading && account?.role !== "coach") {
      void navigate({ to: "/access", replace: true });
    }
  }, [account, loading, navigate]);

  useEffect(() => {
    if (loading || account?.role !== "coach") return;
    // Preload in priority order after dashboard finishes, to eliminate bottom-nav delay
    const preload = async () => {
      try {
        // Priority 1: Programs (user sees after dashboard)
        const { loadPrograms } = await import("@/lib/coach-programs");
        loadPrograms();
        // Preload route for fast navigation
        await router.preloadRoute({ to: "/coach/programs" }).catch(() => {});
      } catch {}
      try {
        // Priority 2: Library (exercises + workouts)
        const { loadExercises } = await import("@/lib/coach-exercises");
        const { loadWorkouts } = await import("@/lib/coach-workouts");
        loadExercises();
        loadWorkouts();
        await router.preloadRoute({ to: "/coach/library" }).catch(() => {});
        await router.preloadRoute({ to: "/coach/library/exercises" }).catch(() => {});
        await router.preloadRoute({ to: "/coach/library/workouts" }).catch(() => {});
      } catch {}
      try {
        // Priority 3: Messaging / Chat
        await router.preloadRoute({ to: "/coach/chat" }).catch(() => {});
      } catch {}
      // Cache static UI text that never changes
      try {
        const { cacheStaticUI } = await import("@/lib/static-cache");
        cacheStaticUI();
      } catch {}
    };
    // Start after 300ms so dashboard paint is not blocked, then stagger
    const id = window.setTimeout(() => void preload(), 300);
    return () => window.clearTimeout(id);
  }, [account, loading, router]);
  const isDashboardActive =
    pathname === "/coach/dashboard" || pathname.startsWith("/coach/clients/");
  const isProgramsActive =
    pathname === "/coach/programs" || pathname.startsWith("/coach/programs/");
  const isLibraryActive = pathname === "/coach/library" || pathname.startsWith("/coach/library/");
  const isMessagingActive = pathname === "/coach/chat" || pathname.startsWith("/coach/chat/");

  if (loading || account?.role !== "coach") {
    return <div className="min-h-[100dvh] bg-background" />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link to="/" className="text-base font-semibold tracking-tight">
            No More Copium
          </Link>
          <div className="flex items-center gap-1">
            <span className="rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Coach Mode
            </span>
            <ChatButton />
            <SettingsMenu />
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6"
        style={{ paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
      >
        <Outlet />
      </main>

      <nav
        aria-label="Coach sections"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex w-full max-w-3xl items-stretch">
          {NAV_ITEMS.map((item) => {
            const active =
              item.to === "/coach/programs"
                ? isProgramsActive
                : item.to === "/coach/dashboard"
                  ? isDashboardActive
                  : item.to === "/coach/library"
                    ? isLibraryActive
                    : item.to === "/coach/chat"
                      ? isMessagingActive
                      : pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2.5 text-[13px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span className={cn("leading-none", active && "underline underline-offset-4")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
