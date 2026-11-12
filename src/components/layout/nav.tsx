"use client";

import { ArrowLeftRight, CircleUserRound, House, LayoutGrid, Link2, Plus, Settings, ShoppingBag, Users } from "lucide-react";
import Link from "next/link";
import { useIsActive } from "@/components/ui/client";
import { cn } from "@/lib/cn";

const icons = {
  grid: LayoutGrid,
  home: House,
  link: Link2,
  activity: ArrowLeftRight,
  settings: Settings,
  account: CircleUserRound,
  users: Users,
  bag: ShoppingBag,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean; mobileLabel?: string };

export function SideNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="grid gap-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-2.5 rounded-sm px-3 text-[14px] font-medium transition-colors duration-[var(--dur-fast)]",
              active ? "bg-[rgba(16,168,138,0.16)] text-cloud" : "text-slate-300 hover:bg-[rgba(247,249,252,0.06)] hover:text-cloud",
            )}
          >
            {active ? <span aria-hidden className="absolute -left-3 bottom-2.5 top-2.5 w-[3px] rounded-r-[3px] bg-emerald" /> : null}
            <Icon className="h-5 w-5 flex-none" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar for phones and tablets. `fabHref` adds the raised "new payment link" action. */
export function TabBar({ items, fabHref }: { items: NavItem[]; fabHref?: string }) {
  const isActive = useIsActive();
  const half = Math.ceil(items.length / 2);
  const cells = fabHref ? [...items.slice(0, half), null, ...items.slice(half)] : items;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-card px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((item) => {
        if (!item) {
          return (
            <Link key="fab" href={fabHref!} aria-label="New payment link" className="grid justify-items-center">
              <span className="-mt-5 grid h-12 w-12 place-items-center rounded-[16px] bg-navy text-emerald shadow-[0_8px_18px_-6px_rgba(20,43,69,0.55)] transition-transform duration-[var(--dur-instant)] active:scale-95">
                <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
            </Link>
          );
        }
        const Icon = icons[item.icon];
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("grid min-h-11 content-center justify-items-center gap-0.5 py-1 text-[10.5px] font-medium", active ? "text-ink" : "text-ink-3")}
          >
            <Icon className={cn("h-5 w-5", active && "text-emerald-700")} strokeWidth={1.75} aria-hidden />
            {item.mobileLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
