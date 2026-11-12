import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav";
import { requireUser } from "@/lib/auth/current";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "grid", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/transactions", label: "Transactions", icon: "activity" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN"], "/admin");
  return (
    <AppShell user={user} nav={nav} homeHref="/admin">
      {children}
    </AppShell>
  );
}
