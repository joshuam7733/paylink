"use client";

import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Modal on desktop, bottom sheet on phones. Radix handles focus trapping, Escape and focus restore;
 * the enter/exit animation is defined in globals.css and collapses to 0ms under reduced motion.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  hideClose,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  hideClose?: boolean;
  className?: string;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="pl-overlay fixed inset-0 z-40 bg-[rgba(15,33,56,0.48)]" />
        <RD.Content
          className={cn(
            "pl-sheet fixed z-50 grid max-h-[92dvh] w-full gap-3 overflow-y-auto bg-card p-5 shadow-lg outline-none",
            "inset-x-0 bottom-0 rounded-t-[22px] pb-[max(20px,env(safe-area-inset-bottom))]",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(440px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-5",
            className,
          )}
        >
          <span aria-hidden className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <RD.Title className="font-display text-[19px] font-[650] leading-snug tracking-[-0.015em]">{title}</RD.Title>
            {hideClose ? null : (
              <RD.Close aria-label="Close" className="-mr-1.5 -mt-1 grid h-9 w-9 flex-none place-items-center rounded-sm text-ink-3 hover:bg-sunken hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </RD.Close>
            )}
          </div>
          {description ? <RD.Description className="text-[14px] text-ink-2">{description}</RD.Description> : null}
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
