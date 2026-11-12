import { Check, Lock, X } from "lucide-react";
import { STATUS_LABELS, isTransactionStatus } from "@/lib/domain/constants";
import { cn } from "@/lib/cn";

const styles: Record<string, string> = {
  PENDING: "bg-info-bg text-info",
  FUNDS_SECURED_DEMO: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald text-navy",
  PAYMENT_FAILED: "bg-danger-bg text-danger",
  CANCELLED: "bg-sunken text-ink-2",
};

/** Colour plus an icon or dot, so status never depends on colour alone. */
export function StatusPill({ status, size = "md", className }: { status: string; size?: "sm" | "md"; className?: string }) {
  const label = isTransactionStatus(status) ? STATUS_LABELS[status] : status;
  const icon =
    status === "FUNDS_SECURED_DEMO" ? (
      <Lock className="h-3 w-3" aria-hidden />
    ) : status === "COMPLETED" ? (
      <Check className="h-3 w-3" aria-hidden strokeWidth={2.5} />
    ) : status === "PAYMENT_FAILED" ? (
      <X className="h-3 w-3" aria-hidden strokeWidth={2.5} />
    ) : (
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    );
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none",
        size === "sm" ? "h-[22px] px-2 text-[11.5px]" : "h-6 px-2.5 text-[12px]",
        styles[status] ?? "bg-sunken text-ink-2",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
