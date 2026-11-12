import { z } from "zod";
import {
  DELIVERY_METHODS,
  DELIVERY_TIMEFRAMES,
  DEMO_OUTCOMES,
  LINK_EXPIRY_OPTIONS,
  MAX_AMOUNT_UGX,
  MIN_AMOUNT_UGX,
  PAYMENT_METHODS,
} from "./domain/constants";
import { formatUGX, normaliseUgPhone, parseAmount } from "./format";

/** Shape returned by every form server action. */
export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export function formValues(fd: FormData, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !omit.includes(k) && !k.startsWith("$")) out[k] = v;
  }
  return out;
}

export function firstErrors(error: z.ZodError): Record<string, string> {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const out: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(flat)) if (msgs?.[0]) out[k] = msgs[0];
  return out;
}

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter an email address, like name@example.com." }));

const password = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(128, { error: "Use 128 characters or fewer." })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: "Include at least one letter and one number." });

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const n = normaliseUgPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a Ugandan mobile number, like 0772 123 456." });
      return z.NEVER;
    }
    return n;
  });

const requiredPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normaliseUgPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a Ugandan mobile number, like 0772 123 456." });
      return z.NEVER;
    }
    return n;
  });

export const registerSchema = z
  .object({
    role: z.enum(["SELLER", "BUYER"], { error: "Choose whether you're selling or buying." }),
    name: z.string().trim().min(2, { error: "Enter your full name." }).max(80),
    email,
    password,
    businessName: z.string().trim().max(80).optional(),
    phone: optionalPhone,
  })
  .superRefine((v, ctx) => {
    if (v.role === "SELLER" && (!v.businessName || v.businessName.length < 2)) {
      ctx.addIssue({ code: "custom", path: ["businessName"], message: "Enter the name buyers know you by." });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }).max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ token: z.string().min(20).max(200), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "The two passwords don't match." });

export const profileSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(80),
  businessName: z.string().trim().min(2, { error: "Enter the name buyers know you by." }).max(80),
  location: z.string().trim().max(80).optional(),
  phone: optionalPhone,
});

const amount = z
  .string()
  .trim()
  .min(1, { error: "Enter the amount in UGX." })
  .transform((v, ctx) => {
    const n = parseAmount(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Enter a whole number of shillings, like 185,000." });
      return z.NEVER;
    }
    if (n < MIN_AMOUNT_UGX || n > MAX_AMOUNT_UGX) {
      ctx.addIssue({
        code: "custom",
        message: `Enter an amount between ${formatUGX(MIN_AMOUNT_UGX)} and ${formatUGX(MAX_AMOUNT_UGX)}.`,
      });
      return z.NEVER;
    }
    return n;
  });

export const createLinkSchema = z
  .object({
    itemName: z.string().trim().min(2, { error: "Enter what you're selling." }).max(120),
    description: z
      .string()
      .trim()
      .min(10, { error: "Describe the item in at least a sentence: size, colour, condition." })
      .max(1000),
    amount,
    quantity: z.coerce.number({ error: "Enter a quantity." }).int().min(1, { error: "Quantity must be at least 1." }).max(999),
    deliveryMethod: z.enum(DELIVERY_METHODS, { error: "Choose how the order will be delivered." }),
    deliveryArea: z.string().trim().max(120).optional(),
    deliveryTimeframe: z.enum(DELIVERY_TIMEFRAMES, { error: "Choose when it will be delivered." }),
    deliveryNotes: z.string().trim().max(300).optional(),
    expiry: z.enum(LINK_EXPIRY_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryMethod !== "BUYER_COLLECTS" && (!v.deliveryArea || v.deliveryArea.length < 2)) {
      ctx.addIssue({ code: "custom", path: ["deliveryArea"], message: "Enter where you deliver, like Kampala and Wakiso." });
    }
    if (v.deliveryMethod === "BUYER_COLLECTS" && (!v.deliveryArea || v.deliveryArea.length < 2)) {
      ctx.addIssue({ code: "custom", path: ["deliveryArea"], message: "Enter where the buyer collects from, like Ntinda, Kampala." });
    }
  });
export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export const demoPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { error: "Choose a mobile money network." }),
  payerName: z.string().trim().min(2, { error: "Enter your name so the seller knows who paid." }).max(80),
  payerPhone: requiredPhone,
  payerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message: "Enter an email address, like name@example.com, or leave it blank." });
        return z.NEVER;
      }
      return v;
    }),
  outcome: z.enum(DEMO_OUTCOMES),
});
export type DemoPaymentInput = z.infer<typeof demoPaymentSchema>;

/** Only allow redirects to same-site relative paths. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
