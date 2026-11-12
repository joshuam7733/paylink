import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav";
import { requireUser } from "@/lib/auth/current";

const nav: NavItem[] = [{ href: "/purchases", label: "My purchases", mobileLabel: "Purchases", icon: "bag" }];

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["BUYER"], "/purchases");
  return (
    <AppShell user={user} nav={nav} homeHref="/purchases">
      {children}
    </AppShell>
  );
}
