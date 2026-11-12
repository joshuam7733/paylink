"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { AnimatePresence, domAnimation, LazyMotion, MotionConfig, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, buttonClass, type ButtonSize, type ButtonVariant } from "./button";
import { cn } from "@/lib/cn";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  // LazyMotion + the slim `m` components keep the animation code small on the checkout page.
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Page transition: crossfade with a short rise. Used from route templates. */
export function PageFade({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_OUT }}
    >
      {children}
    </m.div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  block,
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name={name} value={value} variant={variant} size={size} block={block} className={className} loading={pending} loadingText={pendingText}>
      {children}
    </Button>
  );
}

export function CopyButton({
  text,
  label = "Copy link",
  copiedLabel = "Copied",
  variant = "secondary",
  size = "md",
  iconOnly,
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={iconOnly ? label : undefined}
      className={buttonClass(variant, size, cn(iconOnly && "px-0 w-11", className))}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-700" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {iconOnly ? null : copied ? copiedLabel : label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}

/** Uses the phone's share sheet when available, otherwise opens WhatsApp with the message. */
export function ShareButton({ url, text, variant = "primary", size = "md", className }: { url: string; text: string; variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Paylink", text, url });
        return;
      } catch {
        // dismissed or unsupported: fall through to WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" onClick={share} className={buttonClass(variant, size, className)}>
      <Share2 className="h-4 w-4" aria-hidden />
      Share link
    </button>
  );
}

/** Active-state aware nav link list for sidebars and tab bars. */
export function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact = false) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
}

export function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
