import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Library, ListChecks } from "lucide-react";
import { useEffect, type ComponentType } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { SettingsMenu } from "@/components/account/SettingsMenu";
import { ChatButton } from "@/components/chat/ChatButton";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/coach/dashboard" | "/coach/programs" | "/coach/library";
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/coach/programs", label: "Program Manager", icon: ListChecks },
  { to: "/coach/library", label: "Library", icon: Library },
];

export function CoachShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, account, loading } = useAccount();

  useEffect(() => {
    if (!loading && account?.role !== "coach") {
      void navigate({ to: user && !account ? "/onboarding" : "/", replace: true });
    }
  }, [account, loading, navigate, user]);
  const isDashboardActive =
    pathname === "/coach/dashboard" || pathname.startsWith("/coach/clients/");
  const isProgramsActive =
    pathname === "/coach/programs" || pathname.startsWith("/coach/programs/");
  const isLibraryActive = pathname === "/coach/library" || pathname.startsWith("/coach/library/");

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
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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
                    : pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
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
