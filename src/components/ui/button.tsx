import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "inverse" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none border border-transparent " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--dur-fast)] ease-out " +
  "active:scale-[0.97] active:duration-[var(--dur-instant)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(16,168,138,0.42)] " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  // Approved: emerald label on navy; hover darkens, never lightens.
  primary: "bg-navy text-emerald hover:bg-navy-900 active:bg-navy-950",
  inverse: "bg-emerald text-navy hover:bg-[#1FB596]",
  secondary: "bg-card text-ink border-line hover:border-slate-300 hover:bg-[#FBFCFE]",
  quiet: "bg-transparent text-ink hover:bg-sunken",
  danger: "bg-card text-danger border-[#EBC3C0] hover:bg-danger-bg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[14px] rounded-sm",
  md: "h-11 px-[18px] text-[15px] rounded-md",
  lg: "h-[52px] px-[22px] text-[16px] rounded-[12px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_2.4s_linear_infinite]", className)}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  block?: boolean;
};

export function Button({ variant, size, loading, loadingText, block, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, cn(block && "w-full", className))}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string; children: ReactNode } & Omit<
  ComponentProps<typeof Link>,
  "href" | "className"
>) {
  return (
    <Link href={href} {...rest} className={buttonClass(variant, size, cn(block && "w-full", className))}>
      {children}
    </Link>
  );
}
