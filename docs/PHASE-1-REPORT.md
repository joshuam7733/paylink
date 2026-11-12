# Paylink Phase 1 completion report

Date: 12 November 2026 · Scope: core MVP with simulated payments · Design: approved v0.2

## 1. What was built

A working web application in which a seller creates a payment link, a buyer opens it and pays through a simulated mobile-money step, and both follow the transaction on a shared timeline until the buyer confirms delivery. An administrator can see users and transactions across the platform.

- **Stack:** Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4, Prisma 6 with SQLite, zod, Motion for React, Radix Dialog, Lucide icons.
- **Size:** 20 routes, 9 database tables, 1 migration, 47 unit and integration tests, 12 end-to-end scenarios.
- **Design:** the app imports `design-system/tokens.css` directly, so colours, type, radius, shadows and motion come from the approved tokens. The Interlock logo, emerald-on-navy buttons and account-level demo notice are used throughout.

## 2. What is functional

| Area | Working today |
|---|---|
| Registration | Sellers and buyers register; sellers get a profile. Validation with clear field errors. Duplicate emails refused. |
| Sign-in and sessions | Sign-in, sign-out, 7-day sessions in an `httpOnly` cookie, hashed in the database. Suspended users are signed out and blocked. |
| Password reset | Request, single-use link (30 minutes), new password, all sessions signed out. The email is stored in a development outbox, not sent. |
| Roles | Seller, buyer and administrator areas, each checked on the server for every page and action. |
| Seller dashboard | Totals from database records, recent transactions, recent activity, search, status filters, empty state for new accounts. |
| Payment links | Create with item, description, amount, quantity, delivery details and expiry; unique unguessable link; copy and share; open count; expiry and cancellation. |
| Buyer checkout | Public page with seller, item, amount, delivery and how Paylink works; no account needed; signed-in buyers are recognised. |
| Transaction lifecycle | Create → open → pay → secured → delivered → completed, plus failed (with retry) and cancelled. Every step recorded as an event. |
| Tracking | Shared timeline and history for seller, buyer and admin; buyer confirms receipt; guests return by cookie or private tracking link. |
| Administrator | Overview totals, users (search, filter, suspend, reactivate), all transactions (search, filter), transaction detail with raw status, payment attempts and events. |
| Mobile | Phone layout with bottom tab bar, sticky pay button, bottom sheets, stacked rows instead of tables. |
| Motion | Page fade, press feedback, sheet and modal transitions, status icon pop; all disabled under reduced-motion settings. |

## 3. What is simulated

| Simulated | How it's kept honest |
|---|---|
| Every payment. No provider is contacted; the buyer picks the outcome (succeeds, fails, cancelled) in a "Demo outcome" panel. | `PAYMENTS_MODE=demo` is the only mode; the engine refuses anything else. |
| "Payment secured" status | Stored as `FUNDS_SECURED_DEMO`; every transaction has `isDemo = true`; attempts are stored with provider `DEMO`. |
| Completed values on dashboards | Sums of simulated amounts. The admin overview labels them "(simulated)"; seller screens rely on the permanent demo bar, as approved. |
| Email | Stored in the `DevEmail` table and shown at `/dev/outbox` in development. |
| Mobile-money networks | MTN Mobile Money and Airtel Money appear as choices only. Nothing is sent to either. |

Nothing in the app holds, moves or pays out real money, and no screen shows a spendable balance.

## 4. Test results

Run on 12 November 2026, Windows 10, Node 24, Microsoft Edge.

| Suite | Result |
|---|---|
| Type check (`npm run typecheck`) | Pass, 0 errors |
| Production build (`npm run build`) | Pass, 20 routes |
| Unit and integration (`npm test`) | **47 of 47 passed** |
| End-to-end in the browser (`npm run test:e2e`) | **12 of 12 passed** |

How the requested test areas are covered:

| Requested area | Unit / integration | End-to-end |
|---|---|---|
| Registration and login | hashing, duplicate email, right and wrong password, session validity and expiry | register, validation errors, duplicate, sign-out, wrong password, sign-in, cookie flags |
| Role permissions | seller data scoping, tracking access rules, admin-only user changes | signed-out redirects, seller blocked from admin and buyer areas, buyer blocked from seller and admin areas, another seller gets 404 on a transaction that isn't theirs |
| Payment link creation | pending transaction, unique reference and slug, expiry, first event, sellers only | form validation, link created, link format, shown on detail page |
| Buyer checkout | public data only, open counting, seller's own visits ignored | phone-sized guest checkout shows seller, item, amount, delivery and demo notice; bad phone number rejected |
| Successful simulated payment | status, attempt, buyer, events, pay-once rule | pay, tracking shows "Payment secured", seller sees it, mark delivered, buyer confirms, "Deal completed" |
| Failed simulated payment | status, failure reason, retry succeeds, attempts recorded | failure message, seller sees "Payment failed", retry on same link succeeds |
| Cancelled transactions | buyer cancel closes transaction and disables link; seller cancel before but not after payment | buyer cancels at payment; seller cancels with confirmation; link stops working |
| Transaction history | exact event order and status changes for the full lifecycle | history lines visible to seller, buyer and admin |
| Dashboard calculations | 7 transactions across every status, sums, other sellers excluded, admin totals | stat cards match the transactions created in the run; search and filters return the right rows |
| Administrative access | suspend rules, user search, no password hashes exposed | admin totals, search by reference, raw status, suspend a seller who is then blocked |
| Mobile responsiveness | not applicable | 13 screens checked at 375px for no sideways scrolling; tab bar targets at least 44px; inputs 16px; tables become stacked rows |

Issues found by testing and fixed before this report:

1. After a successful payment the buyer could be left on the checkout page instead of being taken to tracking. The redirect now happens on the server.
2. The demo welcome dialog could reappear if the page was reloaded immediately. "Seen" is now recorded when the dialog is shown.
3. Confirmation dialogs didn't close the second time they were used on the same page.
4. Table headings showed a stray line above the text (a class name clashed with a Tailwind utility).
5. Dropdown arrows were missing; paired form fields sat at different heights; the desktop "New payment link" button also appeared on phones.

## 5. Known bugs and limitations

No known functional bugs at the time of writing. Limitations:

- Payments are simulated; there is no provider, balance, payout or refund.
- Emails and SMS are not sent. Password reset needs an email provider before real use; neither party is notified of events.
- No email or phone verification and no seller identity checks.
- A paid transaction can't be cancelled or disputed yet. The buyer is told to contact the seller.
- One link is one sale; no reusable links.
- Guest buyers rely on their browser cookie or the private tracking link they copy.
- Rate limiting is in memory (single server, resets on restart).
- SQLite is for development and single-server use; PostgreSQL steps are in `docs/DATABASE.md`.
- The link "opened" count rises on each page view while the link is open, including refreshes.
- The checkout page loads about 166 kB of JavaScript (compressed) on first visit, above the 150 kB target in the design notes. Most of it is the framework, the dialog and the animation library.
- Light theme only. Not yet audited with a screen reader, although labels, focus handling, contrast and reduced motion follow the design rules.
- Browser tests run in Microsoft Edge (Chromium). Safari and Firefox were not tested.
- Prisma prints a deprecation notice about the `prisma` block in `package.json`; it is harmless on Prisma 6.

## 6. How to run it

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000. Register a seller, create a link, open it in a private window as the buyer. The administrator signs in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`. Full instructions are in the README.

## 7. Recommended next improvements

Before any real users:

1. Choose a licensed payment partner and get Ugandan legal advice on the protected-payment flow. This decides how Phase 2 payment integration must work.
2. Email and SMS: password reset, "you've been paid", "your order was delivered", and a tracking link sent to guest buyers.
3. PostgreSQL and a hosted environment with HTTPS, backups and monitoring.
4. Phone or email verification at registration, and basic seller verification.

Product:

5. Disputes and refunds: "Report a problem" for buyers, an admin review queue, and cancellation after payment.
6. Delivery tracking: courier details, proof of delivery, and automatic completion if the buyer doesn't respond within a set time.
7. Reusable links for sellers who sell the same item repeatedly, plus item photos.
8. Seller trust signals on checkout: verified badge and completed-deal history.
9. Password change inside settings, and a buyer account page.
10. Terms of service, privacy policy and a help page.

Engineering:

11. Shared rate limiting and an audit log of admin actions.
12. Accessibility audit with a screen reader; Safari and Firefox test runs.
13. Version control and continuous integration running the type check and both test suites on every change.
