# Paylink Design System — v0.2

Decisions (8 Nov 2026): logo **B · Interlock**; primary buttons **emerald label on navy**; type **Bricolage Grotesque + Instrument Sans** (approved); demo mode **real-looking screens with an account-level notice**; domain deferred (`paylink.ug` is a placeholder).

The visual exploration is in `brand-exploration.html`. The tokens are in `tokens.css` and `tokens.json`. This file holds the written rules that later phases must follow.

## 1. Brand personality
Trustworthy, modern, professional, secure, approachable, simple, premium without being intimidating.
In practice: calm navy structure, emerald only where something moves forward, generous Soft Cloud space, nothing hidden.

## 2. Logo
| Concept | Idea | Status |
|---|---|---|
| A · Counter P | Solid navy P whose counter is an emerald dot | Not used |
| **B · Interlock** | Two woven rounded frames: buyer and seller | **Selected** |
| C · Linked P | Navy stem ("pay") + emerald bowl ("link") | Not used |

- Mark: navy frame top-left, emerald frame bottom-right, woven (navy over at the top crossing, emerald over at the bottom crossing).
- Wordmark: lowercase `paylink`, Bricolage Grotesque 700, tracking −3.5%, emerald tittle on the *i*.
- Lockups: horizontal (mark left of wordmark) for headers; stacked (mark above wordmark) for splash screens and social.
- On dark backgrounds navy becomes Soft Cloud; emerald stays.
- Clear space = one ring stroke. Minimum mark size 16px; minimum lockup width 72px.
- Never recolour, outline, rotate, add shadows, or place on busy imagery.
- Files: `logos/paylink-mark.svg`, `paylink-mark-reversed.svg`, `paylink-app-icon.svg`, `favicon.svg` (the favicon switches to Soft Cloud in dark mode). Concept files are kept for reference. Convert the wordmark to outlines before final export.

## 3. Colour
Exactly three brand colours:

| Token | Hex | Role |
|---|---|---|
| `--pl-navy` | `#142B45` | Trust and structure: headings, text, navigation, sidebar |
| `--pl-emerald` | `#10A88A` | Primary actions, focus, progress, positive states |
| `--pl-cloud` | `#F7F9FC` | Page background and breathing space |

Rules:
- Rough proportion on a screen: 70% Cloud/white, 24% navy, 6% emerald.
- **Primary buttons are navy with an emerald label** (4.78:1, AA). Hover and pressed states darken the navy (5.4:1); never lighten it, because lighter navy drops below AA.
- On navy surfaces (sidebar, dark theme) the primary button flips: emerald fill, navy label (4.78:1).
- Any text on an emerald fill is navy. White text on emerald (3.0:1) is not allowed.
- Emerald as *text* uses Emerald 700 `#08745F`.
- Lightest allowed text colour is Slate 500 `#5B6E85` (4.96:1 on Cloud).
- Supporting colours (danger, warning, info, slate neutrals) appear only for state, never for decoration or branding.
- Components use semantic tokens (`--color-action`, `--color-text-secondary`), never raw hex.

## 4. Typography
- Display: **Bricolage Grotesque** 600–700 (headings h1–h3, hero amounts, wordmark).
- Text: **Instrument Sans** 400–600 (body, labels, buttons, tables, navigation). Tabular figures in columns.
- Utility: **IBM Plex Mono** 400–500 (references like `PL-7QK2M9`, slugs, Demo tag). Never paragraphs.
- Inputs are 16px so iOS doesn't zoom.
- Scale and tracking: see `tokens.json → type`.

## 5. Components (built on shadcn/ui, restyled with tokens)
- **Buttons**: primary (navy, emerald label), inverse (emerald, navy label — on navy surfaces only), secondary (white, border), quiet (text), destructive (danger outline). Heights 36 / 44 / 52. One primary per view. Verb-first labels. Loading state keeps the button's width and shows "Creating…".
- **Form fields**: visible label above every field; hint below; error replaces hint, in danger colour with an icon and a fix ("Enter a full 10-digit number, like 0772 123 456"). Validate on blur, clear the error as soon as it's fixed.
- **Amount input**: `UGX` prefix segment, tabular digits, thousands separators, no decimals.
- **Cards**: white, 1px border, radius 14, no shadow.
- **Tables**: uppercase 11px headers, right-aligned tabular amounts, references in mono. On phones, tables become stacked rows.
- **Navigation**: navy sidebar on ≥1024px with emerald active bar; bottom tab bar on phones (Home, Links, + New, Activity, Account).
- **Overlays**: menus and popovers (shadow-md), modals and sheets (radius 20, shadow-lg). On phones, menus and filters become bottom sheets. Destructive confirmations name the item being destroyed.
- **Icons**: Lucide, stroke 1.75; 20px in UI, 16px in pills and dense rows, 24px in empty states.
- **Empty states**: brand mark tile, one sentence, one primary action. No cartoon illustrations, no zero-filled charts.

## 6. Transaction statuses
| Enum | Shown as | Style |
|---|---|---|
| `PENDING` | Awaiting payment | info tint + dot |
| `FUNDS_SECURED_DEMO` | Payment secured | emerald tint + lock |
| `COMPLETED` | Completed | emerald fill, navy label + check |
| `PAYMENT_FAILED` | Payment failed | danger tint + x |
| `CANCELLED` | Cancelled | slate tint + dot |

Every status has colour **and** an icon or dot. The `_DEMO` suffix stays in the database so demo records can never be confused with real ones.

## 7. Demo mode (Phase 1 rule)
Screens look exactly like the live product. Demo mode is made known **at the account level**, so whoever is using a demo account always knows:
- **Demo account bar**: a slim warning-tinted bar above every signed-in screen ("Demo account · Payments are simulated. No real money moves through Paylink yet.") with a "What this means" link. It cannot be dismissed.
- **Avatar badge**: a small "Demo" badge on the account avatar in the sidebar and mobile header.
- **Welcome dialog**: shown once on first sign-in to a demo account, explaining that nothing is charged, held or paid out.
- **Buyer checkout from a demo seller**: the same bar, worded for buyers ("Demo payment link · You won't be charged.").
- **Payment step**: looks like the real mobile-money step, plus one "Demo outcome" panel (succeeds / fails / cancelled). Nothing is sent to a provider.
- Status labels, amounts and totals carry no per-item demo tags. Real-money wording is allowed only on screens that show the demo bar.

## 8. Motion (Motion for React)
| Token | ms | Use |
|---|---|---|
| instant | 80 | press feedback (scale 0.97) |
| fast | 140 | hover, colour changes |
| base | 220 | dropdowns, toasts, tabs, status pill crossfade |
| slow | 360 | modals, sheets, page transitions |
| status | 600 | progress bar on a status change |

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for almost everything; spring `{stiffness: 420, damping: 34}` for sheets.
- Menus scale 0.96 → 1 from their trigger; modals fade the backdrop and lift 8px; pages crossfade with a 12px slide in the direction of travel.
- Loading: nothing under 100ms, inline spinner up to 1s, skeletons beyond.
- Failure never shakes; it changes colour and explains what to do.
- `prefers-reduced-motion`: all durations 0, slides become swaps, shimmer off (use `useReducedMotion()` / `MotionConfig reducedMotion="user"`).

## 9. Responsive
Mobile-first. Breakpoints: sm 640, md 768, lg 1024, xl 1280.
- Phone: one column, 16px gutters, 44px touch targets, sticky bottom action on checkout.
- Tablet: checkout stays one centred column (max 560px).
- Laptop: navy sidebar replaces the tab bar; create-link shows a live buyer preview.
- Desktop: content capped at 1200px; forms ≤ 680px.
- Checkout budget: < 150 KB JS on first load, Latin-subset fonts, no images required to pay.

## 10. Copy
- Write from the user's side ("Awaiting payment", not "PENDING").
- Buttons start with a verb. No "OK" or "Submit".
- Errors say what went wrong and how to fix it, without blame.
- Currency: `UGX 185,000` (code before the amount, comma thousands, no decimals).
