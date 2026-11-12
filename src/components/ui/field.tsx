import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const inputBase =
  "w-full rounded-md border bg-card text-ink text-[16px] placeholder:text-[#8797AB] transition-[border-color,box-shadow] duration-[var(--dur-fast)] " +
  "hover:border-slate-300 focus:outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,168,138,0.28)] disabled:bg-sunken disabled:text-ink-3";

export function inputClass(invalid?: boolean, extra?: string) {
  return cn(inputBase, invalid ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(178,58,51,0.2)]" : "border-line", extra);
}

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-3"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[12.5px] font-medium text-danger" role="alert">
          <CircleAlert className="mt-px h-4 w-4 flex-none" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Input({ invalid, className, ...rest }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={inputClass(invalid, cn("h-11 px-3", className))} />;
}

export function Textarea({ invalid, className, ...rest }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, cn("min-h-[96px] resize-y px-3 py-2.5 leading-[1.45]", className))}
    />
  );
}

export function Select({ invalid, className, children, ...rest }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={inputClass(
        invalid,
        cn(
          "pl-select h-11 appearance-none pl-3 pr-9",
          className,
        ),
      )}
    >
      {children}
    </select>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-[#EBC3C0] bg-danger-bg px-3 py-2.5 text-[14px] font-medium text-danger">
      <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
