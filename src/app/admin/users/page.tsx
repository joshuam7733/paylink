import type { Metadata } from "next";
import Link from "next/link";
import { UserStatusButton } from "@/components/admin/user-status-button";
import { ListCard, Pagination, SearchForm } from "@/components/transactions/list";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { cn } from "@/lib/cn";
import { formatDate, timeAgo } from "@/lib/format";
import { listUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Users" };

const ROLE_FILTERS = [
  { key: "", label: "All" },
  { key: "SELLER", label: "Sellers" },
  { key: "BUYER", label: "Buyers" },
  { key: "ADMIN", label: "Admins" },
];
const ROLE_LABEL: Record<string, string> = { SELLER: "Seller", BUYER: "Buyer", ADMIN: "Admin" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const admin = await requireUser(["ADMIN"], "/admin/users");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const role = sp.role && ["SELLER", "BUYER", "ADMIN"].includes(sp.role) ? sp.role : undefined;
  const list = await listUsers({ q, role, page: Number(sp.page) || 1 });

  return (
    <div className="grid gap-6">
      <PageHeader title="Users" />
      <ListCard
        header={
          <>
            <SearchForm action="/admin/users" q={q} placeholder="Search name, email or business" hidden={{ role }} />
            <nav aria-label="Filter by role" className="flex gap-2 overflow-x-auto pb-1">
              {ROLE_FILTERS.map((f) => {
                const params = new URLSearchParams();
                if (f.key) params.set("role", f.key);
                if (q) params.set("q", q);
                const on = (role ?? "") === f.key;
                return (
                  <Link
                    key={f.key}
                    href={params.size ? `/admin/users?${params}` : "/admin/users"}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "inline-flex h-8 flex-none items-center rounded-full border px-3 text-[13px] font-medium",
                      on ? "border-navy bg-navy text-cloud" : "border-line bg-card text-ink-2 hover:border-slate-300",
                    )}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </nav>
          </>
        }
      >
        {list.rows.length === 0 ? (
          <EmptyState title="No users match">Try a different name or email, or clear the role filter.</EmptyState>
        ) : (
          <>
            <ul data-testid="users-list">
              {list.rows.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1 basis-[220px]">
                    <div className="truncate text-[14px] font-semibold">
                      {u.sellerProfile?.businessName ?? u.name}
                      {u.sellerProfile ? <span className="font-normal text-ink-3"> · {u.name}</span> : null}
                    </div>
                    <div className="truncate text-[13px] text-ink-3">{u.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
                    <span className="inline-flex h-6 items-center rounded-full bg-sunken px-2.5 text-[12px] font-semibold">{ROLE_LABEL[u.role] ?? u.role}</span>
                    <span
                      data-testid={`status-${u.email}`}
                      className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold", u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-danger-bg text-danger")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {u.status === "ACTIVE" ? "Active" : "Suspended"}
                    </span>
                    <span className="tnum">
                      {u.role === "SELLER" ? `${u._count.sales} sales` : u.role === "BUYER" ? `${u._count.purchases} purchases` : "—"}
                    </span>
                    <span className="text-ink-3">Joined {formatDate(u.createdAt)}</span>
                    <span className="text-ink-3">{u.lastLoginAt ? `Last sign-in ${timeAgo(u.lastLoginAt)}` : "Never signed in"}</span>
                  </div>
                  {u.id !== admin.id && u.role !== "ADMIN" ? <UserStatusButton userId={u.id} email={u.email} status={u.status} /> : <span className="w-[76px]" />}
                </li>
              ))}
            </ul>
            <Pagination basePath="/admin/users" page={list.page} pageSize={list.pageSize} total={list.total} params={{ q, role }} />
          </>
        )}
      </ListCard>
    </div>
  );
}
