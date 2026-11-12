import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav";
import { requireUser } from "@/lib/auth/current";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", mobileLabel: "Home", icon: "home", exact: true },
  { href: "/dashboard/links", label: "Payment links", mobileLabel: "Links", icon: "link" },
  { href: "/dashboard/transactions", label: "Transactions", mobileLabel: "Activity", icon: "activity" },
  { href: "/dashboard/settings", label: "Settings", mobileLabel: "Account", icon: "account" },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["SELLER"], "/dashboard");
  return (
    <AppShell user={user} nav={nav} fabHref="/dashboard/links/new" homeHref="/dashboard">
      {children}
    </AppShell>
  );
}
