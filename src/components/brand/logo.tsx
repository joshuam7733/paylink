import { useId } from "react";
import { cn } from "@/lib/cn";

/** The approved Interlock mark: navy frame (buyer) woven with emerald frame (seller). */
export function LogoMark({ className, tone = "default", title }: { className?: string; tone?: "default" | "reversed"; title?: string }) {
  const clip = useId();
  const navy = tone === "reversed" ? "#F7F9FC" : "#142B45";
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clip}>
          <rect x="20" y="34" width="12" height="12" />
        </clipPath>
      </defs>
      <rect x="26" y="24" width="28" height="28" rx="9" fill="none" stroke="#10A88A" strokeWidth="7" />
      <rect x="10" y="12" width="28" height="28" rx="9" fill="none" stroke={navy} strokeWidth="7" />
      <rect x="26" y="24" width="28" height="28" rx="9" fill="none" stroke="#10A88A" strokeWidth="7" clipPath={`url(#${clip})`} />
    </svg>
  );
}

/** Lowercase wordmark with the emerald tittle on the i. */
export function Wordmark({ className, tone = "default" }: { className?: string; tone?: "default" | "reversed" }) {
  return (
    <span
      className={cn(
        "font-display font-bold leading-none tracking-[-0.035em]",
        tone === "reversed" ? "text-cloud" : "text-navy",
        className,
      )}
    >
      payl
      <span className="relative inline-block">
        ı
        <span aria-hidden className="absolute left-1/2 top-[0.075em] h-[0.19em] w-[0.19em] -translate-x-[52%] rounded-full bg-emerald" />
      </span>
      nk
    </span>
  );
}

export function Logo({ className, tone = "default", size = "md" }: { className?: string; tone?: "default" | "reversed"; size?: "sm" | "md" | "lg" }) {
  const mark = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const word = size === "sm" ? "text-[18px]" : size === "lg" ? "text-[32px]" : "text-[22px]";
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="Paylink">
      <LogoMark className={mark} tone={tone} />
      <Wordmark className={word} tone={tone} />
    </span>
  );
}
