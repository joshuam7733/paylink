import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import type { SessionUser } from "@/lib/auth/sessions";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { DemoBar } from "./demo-notice";
import { SideNav, TabBar, type NavItem } from "./nav";

export function Avatar({ name, demo, tone = "navy", size = 36 }: { name: string; demo?: boolean; tone?: "navy" | "emerald"; size?: number }) {
  return (
    <span className="relative inline-grid flex-none">
      <span
        className={cn("grid place-items-center rounded-full text-[13px] font-semibold", tone === "emerald" ? "bg-emerald text-navy" : "bg-navy text-cloud")}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initials(name)}
      </span>
      {demo ? (
        <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 rounded-[4px] border border-[#EBCB94] bg-warn-bg px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.06em] text-warn">
          Demo
        </span>
      ) : null}
    </span>
  );
}

const ROLE_LABEL: Record<string, string> = { SELLER: "seller", BUYER: "buyer", ADMIN: "administrator" };

export function AppShell({
  user,
  nav,
  fabHref,
  homeHref,
  children,
}: {
  user: SessionUser;
  nav: NavItem[];
  fabHref?: string;
  homeHref: string;
  children: ReactNode;
}) {
  const displayName = user.sellerProfile?.businessName ?? user.name;
  const roleLine = `${user.isDemo ? "Demo " : ""}${ROLE_LABEL[user.role] ?? "user"} account`;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 bg-navy px-3 py-5 lg:flex">
        <Link href={homeHref} className="mb-4 px-3 py-1">
          <Logo tone="reversed" />
        </Link>
        <SideNav items={nav} />
        <span className="flex-1" />
        <div className="mt-2 flex items-center gap-2.5 border-t border-[#2A4566] px-3 pb-1 pt-4 text-[13.5px] text-cloud">
          <Avatar name={displayName} demo={user.isDemo} tone="emerald" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{displayName}</div>
            <div className="truncate text-[12px] text-slate-300">{roleLine.charAt(0).toUpperCase() + roleLine.slice(1)}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-sm text-slate-300 hover:bg-[rgba(247,249,252,0.08)] hover:text-cloud">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {user.isDemo ? <DemoBar firstVisit={!user.demoWelcomeSeenAt} /> : null}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-card px-4 py-2.5 lg:hidden">
          <Link href={homeHref}>
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Avatar name={displayName} demo={user.isDemo} size={32} />
            <form action={logoutAction}>
              <button type="submit" aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-sm text-ink-2 hover:bg-sunken">
                <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main className="page-gutter mx-auto w-full max-w-[1200px] flex-1 pb-28 pt-6 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <TabBar items={nav} fabHref={fabHref} />
    </div>
  );
}
