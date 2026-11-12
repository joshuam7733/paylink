# Paylink

Paylink is transaction infrastructure for buyers and sellers who have never met. A seller creates a payment link for one sale; the buyer sees who they're paying, what for and how it will be delivered; both follow the deal on a shared timeline until the buyer confirms it arrived.

**Phase 1 status: working MVP with simulated payments only.** No payment provider is connected and no real money is charged, held or paid out. See [Financial and regulatory boundaries](#financial-and-regulatory-boundaries).

- Design system: [`design-system/`](design-system/) (approved v0.2)
- Phase 1 completion report and test results: [`docs/PHASE-1-REPORT.md`](docs/PHASE-1-REPORT.md)
- Database notes: [`docs/DATABASE.md`](docs/DATABASE.md)

## Quick start

Requirements: Node.js 20.18 or newer (built and tested on Node 24) and npm. No database server is needed for local development.

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

Then open http://localhost:3000.

- `npm run db:migrate` creates `prisma/dev.db` and applies every migration.
- `npm run db:seed` creates the administrator account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`. Change the password in `.env` before seeding anything other people can reach.
- Sellers and buyers register themselves at `/register`.
- Emails (password resets) are not sent yet. In development they are stored and shown at `/dev/outbox`.

### Try the whole flow

1. Register as a seller at `/register`.
2. Create a payment link ("New payment link").
3. Copy the link and open it in a private window: that's the buyer's view. No account is needed.
4. Press **Pay**, enter a Ugandan mobile number (for example `0772 123 456`), choose a demo outcome (succeeds, fails or cancelled) and pay.
5. Back in the seller window, open the transaction and press **Mark as delivered**.
6. In the buyer window, press **I've received my order**. The transaction is now completed, with the full history on both sides.
7. Sign in as the administrator to see users, all transactions and their event history under `/admin`.

## Environment variables

Copy `.env.example` to `.env`. `.env` is ignored by git.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` | Prisma connection string. For SQLite the path is relative to `prisma/`. |
| `APP_URL` | yes | `http://localhost:3000` | Public base URL. Used to build payment links, tracking links and password reset links. |
| `PAYMENTS_MODE` | no | `demo` | Only `demo` exists in Phase 1. The payment engine refuses to run in any other mode. |
| `SESSION_TTL_DAYS` | no | `7` | How long a sign-in lasts. |
| `SEED_ADMIN_EMAIL` | for seeding | `admin@paylink.test` | Administrator account created by `npm run db:seed`. |
| `SEED_ADMIN_PASSWORD` | for seeding | example value | Administrator password, at least 10 characters. Change it. |
| `ENABLE_DEV_OUTBOX` | no | `false` | Shows `/dev/outbox` in a production build. Keep `false` on anything shared. |

## Database and migrations

Prisma ORM with SQLite for local development. The schema is in [`prisma/schema.prisma`](prisma/schema.prisma) and every change is a migration in `prisma/migrations/`. Never edit the database by hand.

| Task | Command |
|---|---|
| Apply migrations in development (and create new ones after editing the schema) | `npm run db:migrate` |
| Apply existing migrations in production or CI | `npm run db:deploy` |
| Wipe the development database and start again | `npm run db:reset` |
| Create the administrator | `npm run db:seed` |
| Browse data | `npm run db:studio` |

To change the schema: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name describe_the_change`, and commit the generated folder. Moving to PostgreSQL is described in [`docs/DATABASE.md`](docs/DATABASE.md).

Tables: `User`, `SellerProfile`, `Session`, `PasswordResetToken`, `Transaction`, `PaymentLink`, `PaymentAttempt`, `TransactionEvent`, `DevEmail`.

## Testing

| What | Command | Notes |
|---|---|---|
| Type checking | `npm run typecheck` | |
| Unit and integration tests | `npm test` | Vitest. Uses its own database `prisma/test/unit.db`, rebuilt from the migrations on every run. |
| End-to-end browser tests | `npm run test:e2e` | Playwright, driving the installed Microsoft Edge. Builds the app for production, starts it on port 3100 with its own database `prisma/test/e2e.db`, then runs 12 scenarios. Takes several minutes. Stop `npm run dev` first, because both use the `.next` folder. |

To run the browser tests in Chrome instead: `PW_CHANNEL=chrome npm run test:e2e`.

Neither test suite touches `prisma/dev.db`.

Screenshots of the main screens from the last test run are in [`docs/screenshots/`](docs/screenshots/). To retake them, start the built app on port 3100 against the test database and run `node tests/e2e/screenshots.mjs docs/screenshots`.

## What's implemented

**Accounts and access**
- Registration for sellers and buyers, sign-in, sign-out, password reset by single-use emailed link (30-minute expiry).
- Passwords hashed with scrypt and a per-user salt. Sessions are random 256-bit tokens in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production); only a SHA-256 hash is stored in the database.
- Three roles: seller, buyer, administrator. Every protected page and every server action checks the role on the server; data queries are scoped to the signed-in user.
- Administrators are created by the seed script only; nobody can register as one.
- Basic rate limiting on sign-in, registration, password reset and payment attempts.

**Seller**
- Dashboard with totals counted from the database (all, in progress, completed with value, failed or cancelled), recent transactions, recent activity, and an empty state for new accounts.
- Create payment link: item, description, amount in UGX, quantity, delivery method, area, timeframe, notes, and link expiry, with a live buyer preview.
- Payment links list with copy button, open count and expiry.
- Transactions list with search (item, buyer, reference) and status filters; detail page with shareable link, buyer details, payment attempts, progress timeline and full event history.
- Mark as delivered; cancel before payment (with confirmation).
- Profile settings.

**Buyer**
- Public checkout page at `/pay/{slug}` that works without an account: seller, item, amount, delivery terms, how Paylink works.
- Payment step that looks like the real mobile-money step (MTN Mobile Money or Airtel Money plus phone number).
- Tracking page at `/t/{reference}` with the same timeline the seller sees, and "I've received my order" to complete the deal. Guests are recognised by a private key stored in a cookie, and can copy a private tracking link for another device.
- Registered buyers see their orders under "My purchases".

**Simulated payment engine**
- Payment initiated, successful, failed and cancelled, chosen through a "Demo outcome" panel on the payment step.
- Statuses: `PENDING`, `FUNDS_SECURED_DEMO`, `PAYMENT_FAILED`, `CANCELLED`, `COMPLETED`. Changes go through one state machine and are applied atomically.
- Every attempt is stored (`PaymentAttempt`, provider `DEMO`) and every step is stored as a `TransactionEvent`.

**Administrator**
- Platform overview, users list (search, role filter, suspend and reactivate), all transactions (search, status filter), transaction detail with raw status, payment attempts and event history.

**Demo mode (approved design)**
- Screens look like the live product. Demo status is shown at account level: a bar on every signed-in screen that can't be dismissed, a "Demo" badge on the avatar, a one-time welcome dialog, and a notice on every checkout and tracking page from a demo seller.

## Architecture

```
design-system/        approved tokens, logos and rules (tokens.css is imported by the app)
prisma/               schema, migrations, seed
src/
  app/                routes (Next.js App Router): landing, (auth), dashboard, purchases, admin, pay, t, dev
  actions/            server actions: auth, seller, buyer, admin. Each one checks access first.
  components/         ui (buttons, fields, dialog), layout (shell, nav, demo bar), feature components
  lib/
    domain/           constants (statuses, labels) and the transaction state machine
    services/         users.ts and transactions.ts: all business rules and database access
    auth/             sessions.ts (framework-free) and current.ts (cookies, requireUser)
    validation.ts     zod schemas for every form
tests/unit/           Vitest: pure logic plus service tests against a real SQLite database
tests/e2e/            Playwright scenarios
```

Stack: Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4, Prisma 6, zod, Motion for React, Radix Dialog, Lucide icons.

Where later phases plug in:
- **Payment providers:** `simulateDemoPayment` in `src/lib/services/transactions.ts` is the only place that decides a payment outcome. A real provider adds an "initiate" call and a webhook that drives the same state machine, writing to the same `PaymentAttempt` and `TransactionEvent` tables.
- **Delivery and disputes:** new transitions go in `src/lib/domain/state-machine.ts`; new event types go in `EVENT_TYPES`. The timeline and history render from stored events.

## Known limitations

- **Payments are simulated.** There is no provider integration, no real charge, no balance and no payout.
- **Email is not sent.** Password reset emails are stored in the `DevEmail` table and shown at `/dev/outbox` in development. An email provider is needed before real users can reset passwords.
- **No email or phone verification** of accounts, and no seller identity checks (KYC).
- **A paid transaction can't be cancelled or refunded,** and there is no dispute flow. These belong to later phases.
- **One link is one sale.** Reusable links and multi-item carts aren't supported.
- **Guest buyers depend on their browser** (or the private tracking link they copy). There are no SMS or email notifications for either party.
- **Rate limiting is in memory,** so it resets on restart and isn't shared between servers.
- **SQLite** suits development and a single small server. Move to PostgreSQL before a multi-user launch.
- **Light theme only.** Dark-theme tokens exist but the app doesn't switch themes yet.
- Search is a simple "contains" match, and lists are paged at 20 to 25 rows.
- The seller-side "Buyer" column shows the name typed at payment; it isn't verified.

## Outstanding dependencies before real money

1. A licensed payment partner (bank, mobile money aggregator or payment service provider) that can legally collect and hold customer funds.
2. Ugandan legal and regulatory advice on the escrow-like flow, including the National Payment Systems Act, Bank of Uganda licensing, data protection and consumer protection.
3. Terms of service, privacy policy and a refund and dispute policy.
4. Production infrastructure: PostgreSQL, hosting, HTTPS, backups, monitoring, an email provider and an SMS provider.
5. The real domain (the design uses `paylink.ug` as a placeholder) and the final outlined logo files.

## Financial and regulatory boundaries

Paylink's workflow resembles escrow, but building it does not give Paylink legal authority to hold customer funds. In Phase 1:

- `PAYMENTS_MODE` must be `demo`; the engine refuses otherwise.
- Every transaction row has `isDemo = true`, and the secured status is stored as `FUNDS_SECURED_DEMO`, so demo records can never be mistaken for real ones.
- Every screen that shows a payment status also shows the demo notice.

Do not connect live payment collection until the items under "Outstanding dependencies" are in place.
