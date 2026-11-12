import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cn("min-w-0 rounded-lg border border-line bg-card", className)} />;
}

export function StatCard({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <Card className={cn("grid gap-1.5 p-4", className)}>
      <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
      <span className="tnum font-display text-[28px] font-[650] leading-none tracking-[-0.02em]">{value}</span>
      {sub ? <span className="text-[12px] text-ink-3">{sub}</span> : null}
    </Card>
  );
}

export function EmptyState({ icon, title, children, actions }: { icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2.5 px-6 py-12 text-center">
      {icon ? <span className="mb-1.5 grid h-16 w-16 place-items-center rounded-[18px] bg-emerald-50 text-emerald-700">{icon}</span> : null}
      <h2 className="text-[20px]">{title}</h2>
      {children ? <div className="max-w-[44ch] text-[14px] text-ink-2">{children}</div> : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid min-w-0 gap-1">
        {eyebrow ? <div className="text-[13px] text-ink-3">{eyebrow}</div> : null}
        <h1 className="text-[26px] leading-tight md:text-[30px]">{title}</h1>
        {children}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
