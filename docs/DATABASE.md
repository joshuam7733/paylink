# Database notes

## Model overview

| Table | Purpose | Key relationships |
|---|---|---|
| `User` | Every account. `role` is `SELLER`, `BUYER` or `ADMIN`; `status` is `ACTIVE` or `SUSPENDED`; `isDemo` marks demo accounts. | has one `SellerProfile`; has many `Session`, `PasswordResetToken`; sales and purchases via `Transaction` |
| `SellerProfile` | Business name, location and phone shown to buyers. | belongs to one `User` |
| `Session` | Sign-in sessions. `id` is the SHA-256 hash of the cookie token. | belongs to `User` (deleted with the user) |
| `PasswordResetToken` | Single-use reset links, stored as a hash with an expiry. | belongs to `User` |
| `Transaction` | One sale: item, amount, delivery terms, status, buyer details and timestamps. | belongs to a seller `User`; optionally to a buyer `User`; has one `PaymentLink`; has many `PaymentAttempt` and `TransactionEvent` |
| `PaymentLink` | The public link for a transaction: unguessable `slug`, expiry, disabled flag, open count. | one-to-one with `Transaction` |
| `PaymentAttempt` | Every payment try, its provider (`DEMO`), method, payer, outcome and failure reason. | belongs to `Transaction` |
| `TransactionEvent` | Append-only history: type, actor, status before and after, message, time. | belongs to `Transaction` |
| `DevEmail` | Development outbox for emails that would have been sent. | none |

Enum-like columns (`role`, `status`, `deliveryMethod`, event `type` and so on) are stored as strings. The allowed values live in `src/lib/domain/constants.ts` and are enforced by zod validation and the state machine. This keeps the schema portable between SQLite and PostgreSQL.

Amounts are whole Uganda shillings stored as integers.

## Access rules enforced in code

- Sellers: every query filters by `sellerId` (see `getSellerTransaction`, `listSellerTransactions`, `getSellerStats`). Another seller's ID returns "not found".
- Buyers: `listBuyerPurchases` filters by `buyerId`. Tracking pages are decided by `resolveTrackingAccess`: the seller, an administrator, the signed-in buyer, or a guest holding the buyer key.
- Administrators: `requireUser(["ADMIN"])` on every admin page and action.
- Public checkout (`getCheckout`) selects only the fields a buyer needs.

## Status changes

All transaction status changes go through `transition()` in `src/lib/services/transactions.ts`, which uses the rules in `src/lib/domain/state-machine.ts` and an `updateMany ... where status in (...)` guard, so two requests can't both move the same transaction.

```
PENDING ──payment succeeds──▶ FUNDS_SECURED_DEMO ──buyer confirms──▶ COMPLETED
   │  ▲
   │  └─ retry ─ PAYMENT_FAILED ──payment succeeds──▶ FUNDS_SECURED_DEMO
   ├──payment fails──▶ PAYMENT_FAILED
   └──buyer cancels at payment, or seller cancels──▶ CANCELLED
```

## Migrations

- Development: `npm run db:migrate` (creates and applies migrations).
- Production and CI: `npm run db:deploy` (applies committed migrations only).
- Never change tables by hand. Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name describe_the_change`.

## Moving to PostgreSQL

SQLite migrations can't be replayed on PostgreSQL, so the move is a one-time re-baseline. Do it before there is production data.

1. Provision a PostgreSQL database and set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/paylink"`.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Delete `prisma/migrations/` and run `npx prisma migrate dev --name init_postgres` to generate a fresh baseline.
4. Optional improvements once on PostgreSQL: convert the string columns to native enums, and add `mode: "insensitive"` to the `contains` filters in the services (SQLite's `LIKE` is already case-insensitive for ASCII; PostgreSQL's is not).
5. Run `npm run db:seed`, then `npm test` and `npm run test:e2e` with the test database URLs pointed at PostgreSQL databases.
