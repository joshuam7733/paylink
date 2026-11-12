import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { E2E_ENV } from "../../playwright.config";

// One story, told in order: the tests share the accounts and links created along the way.
test.describe.configure({ mode: "serial" });

const PASSWORD = "E2E-Test-Pass-123";
const NEW_PASSWORD = "E2E-New-Pass-456";
const run = Date.now().toString(36);
const sellerA = { name: "Sarah Nakato", business: "Nakato Crafts", email: `seller-a-${run}@paylink.test` };
const sellerB = { name: "Brian Okello", business: "Okello Phones", email: `seller-b-${run}@paylink.test` };
const buyer = { name: "Grace Akello", email: `buyer-${run}@paylink.test` };

const MOBILE = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1280, height: 900 } };

let sellerCtx: BrowserContext;
let seller: Page;
const links: Record<string, { payPath: string; detailPath: string; reference: string }> = {};

async function register(page: Page, who: { name: string; email: string; business?: string }, role: "seller" | "buyer") {
  await page.goto("/register");
  if (role === "buyer") await page.getByText("I'm buying").click();
  await page.getByLabel("Full name").fill(who.name);
  if (who.business) await page.getByLabel("Business or shop name").fill(who.business);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function dismissWelcome(page: Page) {
  await expect(page.getByRole("dialog", { name: "You're in a demo account" })).toBeVisible();
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function createLink(page: Page, key: string, item: string, amount: string) {
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Item or service").fill(item);
  await page.getByLabel("Description").fill(`${item}: brand new, as shown in the photos I sent you.`);
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByLabel("Delivery area").fill("Kampala and Wakiso");
  await page.getByRole("button", { name: "Create payment link" }).click();
  await page.waitForURL(/\/dashboard\/transactions\/[a-z0-9]+\?created=1/);
  await expect(page.getByRole("heading", { name: "Link ready to share" })).toBeVisible();
  const url = (await page.getByTestId("pay-url").innerText()).trim();
  expect(url).toMatch(new RegExp(`^${E2E_ENV.APP_URL}/pay/[a-z0-9]{12}$`));
  links[key] = {
    payPath: new URL(url).pathname,
    detailPath: new URL(page.url()).pathname,
    reference: (await page.getByTestId("reference").innerText()).trim(),
  };
  return links[key]!;
}

async function guestContext(browser: Browser, mobile = true) {
  return browser.newContext(mobile ? MOBILE : DESKTOP);
}

async function pay(page: Page, opts: { outcome: "Succeeds" | "Fails" | "Cancelled"; name?: string; phone?: string }) {
  await page.getByTestId("open-pay").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("demo-outcome")).toBeVisible();
  if (opts.phone !== undefined) await dialog.getByLabel("Mobile money number").fill(opts.phone);
  if (opts.name !== undefined) await dialog.getByLabel("Your name").fill(opts.name);
  await dialog.getByText(opts.outcome, { exact: true }).click();
  await dialog.locator('button[type="submit"]').click();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1);
}

test.beforeAll(async ({ browser }) => {
  sellerCtx = await browser.newContext(DESKTOP);
  seller = await sellerCtx.newPage();
});

test.afterAll(async () => {
  await sellerCtx?.close();
});

test("registration: a new seller lands on an honest, empty dashboard", async () => {
  await register(seller, sellerA, "seller");
  await seller.waitForURL("**/dashboard");
  await dismissWelcome(seller);
  await expect(seller.getByTestId("demo-bar")).toContainText("Demo account");
  await expect(seller.getByRole("heading", { name: "No transactions yet" })).toBeVisible();
  // No fabricated numbers for a new account.
  await expect(seller.getByTestId("stats")).toHaveCount(0);
  // The welcome dialog is shown once only.
  await seller.reload();
  await expect(seller.getByRole("heading", { name: "No transactions yet" })).toBeVisible();
  await expect(seller.getByRole("dialog")).toHaveCount(0);
});

test("registration validates input and refuses a duplicate email", async ({ browser }) => {
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);

  await register(page, sellerA, "seller");
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
  await ctx.close();
});

test("login and logout: sessions start, end and reject wrong passwords", async () => {
  await seller.getByRole("button", { name: "Sign out" }).click();
  await seller.waitForURL("**/login");
  await seller.goto("/dashboard");
  await expect(seller).toHaveURL(/\/login\?next=%2Fdashboard/);

  await login(seller, sellerA.email, "Wrong-Password-000");
  await expect(seller.getByText("That email and password don't match")).toBeVisible();

  await login(seller, sellerA.email, PASSWORD);
  await seller.waitForURL("**/dashboard");
  const cookies = await sellerCtx.cookies();
  const session = cookies.find((c) => c.name === "pl_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
});

test("payment link creation: validates, then generates a unique working link", async () => {
  await seller.goto("/dashboard/links/new");
  await seller.getByRole("button", { name: "Create payment link" }).click();
  await expect(seller.getByText("Enter what you're selling.")).toBeVisible();
  await expect(seller.getByText("Enter the amount in UGX.")).toBeVisible();

  const first = await createLink(seller, "basket", "Handwoven raffia basket set", "185000");
  expect(first.reference).toMatch(/^PL-[A-Z0-9]{6}$/);
  await expect(seller.locator('[data-status="PENDING"]').first()).toBeVisible();
  await expect(seller.getByTestId("timeline")).toContainText("Link created");
  await expect(seller.getByTestId("event-log")).toContainText("Payment link created for UGX 185,000");
});

test("buyer checkout on a phone: guest sees the deal and completes a successful simulated payment", async ({ browser }) => {
  const ctx = await guestContext(browser);
  const page = await ctx.newPage();
  await page.goto(links.basket!.payPath);

  await expect(page.getByTestId("demo-bar")).toContainText("Demo payment link");
  await expect(page.getByTestId("seller-name")).toHaveText("Nakato Crafts");
  await expect(page.getByTestId("item-name")).toHaveText("Handwoven raffia basket set");
  await expect(page.getByTestId("amount")).toContainText("185,000");
  await expect(page.getByText("Seller delivers in Kampala and Wakiso")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How Paylink works" })).toBeVisible();
  await expect(page.getByText("No account needed to pay")).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Bad phone number is caught before anything is recorded.
  await pay(page, { outcome: "Succeeds", name: "Grace Akello", phone: "0772 12" });
  await expect(page.getByText("Enter a Ugandan mobile number")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Mobile money number").fill("0772123456");
  await page.getByRole("dialog").locator('button[type="submit"]').click();

  await page.waitForURL(`**/t/${links.basket!.reference}`);
  await expect(page.getByTestId("status-title")).toHaveText("Payment secured");
  await expect(page.getByTestId("status-title")).toHaveAttribute("data-status", "FUNDS_SECURED_DEMO");
  await expect(page.getByTestId("demo-bar")).toContainText("No real money has moved");
  await expect(page.getByTestId("event-log")).toContainText("Payment of UGX 185,000 secured via MTN Mobile Money");
  await expectNoHorizontalScroll(page);

  // The seller sees it, delivers, and the buyer completes the deal.
  await seller.goto(links.basket!.detailPath);
  await expect(seller.locator('[data-status="FUNDS_SECURED_DEMO"]').first()).toBeVisible();
  await expect(seller.getByText("Grace Akello").first()).toBeVisible();
  await seller.getByRole("button", { name: "Mark as delivered" }).click();
  await expect(seller.getByText("Marked as delivered. Waiting for the buyer")).toBeVisible();

  await page.reload();
  await expect(page.getByText("has marked your order as delivered")).toBeVisible();
  await page.getByRole("button", { name: "I've received my order" }).click();
  await page.getByRole("button", { name: "Confirm received" }).click();
  await expect(page.getByTestId("status-title")).toHaveText("Deal completed");
  await expect(page.getByTestId("status-title")).toHaveAttribute("data-status", "COMPLETED");

  // A paid link can't be paid again, and a stranger can't see the order.
  await page.goto(links.basket!.payPath);
  await expect(page.getByText("This payment link has already been paid")).toBeVisible();
  await expect(page.getByTestId("open-pay")).toHaveCount(0);
  const stranger = await guestContext(browser);
  const sp = await stranger.newPage();
  await sp.goto(`/t/${links.basket!.reference}`);
  await expect(sp.getByRole("heading", { name: "We can't show this transaction" })).toBeVisible();
  await stranger.close();
  await ctx.close();
});

test("failed simulated payment: buyer is told what happened and can retry on the same link", async ({ browser }) => {
  await createLink(seller, "dress", "Kitenge dress size M", "95,000");
  const ctx = await guestContext(browser);
  const page = await ctx.newPage();
  await page.goto(links.dress!.payPath);
  await pay(page, { outcome: "Fails", name: "Esther Nambi", phone: "0701234567" });
  await expect(page.getByRole("dialog").getByText("The payment didn't go through and nothing was taken")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(links.dress!.payPath));

  await seller.goto(links.dress!.detailPath);
  await expect(seller.locator('[data-status="PAYMENT_FAILED"]').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("The last payment didn't go through")).toBeVisible();
  await pay(page, { outcome: "Succeeds", name: "Esther Nambi", phone: "0701234567" });
  await page.waitForURL(`**/t/${links.dress!.reference}`);
  await expect(page.getByTestId("status-title")).toHaveText("Payment secured");

  await seller.reload();
  await expect(seller.getByTestId("attempts")).toContainText("Failed");
  await expect(seller.getByTestId("attempts")).toContainText("Succeeded");
  await ctx.close();
});

test("cancelled transactions: by the buyer at payment, and by the seller before payment", async ({ browser }) => {
  await createLink(seller, "sandals", "Beaded sandals", "55000");
  const ctx = await guestContext(browser);
  const page = await ctx.newPage();
  await page.goto(links.sandals!.payPath);
  await pay(page, { outcome: "Cancelled", name: "Joan Tendo", phone: "0751234567" });
  await page.waitForURL(`**/t/${links.sandals!.reference}`);
  await expect(page.getByTestId("status-title")).toHaveText("Transaction cancelled");
  await page.goto(links.sandals!.payPath);
  await expect(page.getByText("This payment link was cancelled")).toBeVisible();
  await expect(page.getByTestId("open-pay")).toHaveCount(0);
  await ctx.close();

  await createLink(seller, "runner", "Bark cloth table runner", "48000");
  await seller.getByRole("button", { name: "Cancel transaction…" }).click();
  await expect(seller.getByRole("dialog", { name: `Cancel ${links.runner!.reference}?` })).toBeVisible();
  await seller.getByRole("dialog").getByRole("button", { name: "Cancel transaction" }).click();
  await expect(seller.locator('[data-status="CANCELLED"]').first()).toBeVisible();
  await expect(seller.getByTestId("event-log")).toContainText("Seller cancelled the transaction");
  await expect(seller.getByTestId("share-card")).toHaveCount(0);
});

test("dashboard calculations, history, search and filtering use the real records", async () => {
  await seller.goto("/dashboard");
  await expect(seller.getByTestId("stat-total")).toHaveText("4");
  await expect(seller.getByTestId("stat-in-progress")).toHaveText("1");
  await expect(seller.getByTestId("stat-completed")).toHaveText("1");
  await expect(seller.getByTestId("stat-failed")).toHaveText("2");
  await expect(seller.getByTestId("stats")).toContainText("0 awaiting payment · 1 secured");
  await expect(seller.getByTestId("stats")).toContainText("UGX 185,000");
  await expect(seller.getByTestId("stats")).toContainText("0 failed · 2 cancelled");
  await expect(seller.getByTestId("recent-activity")).toContainText("Seller cancelled the transaction");

  await seller.goto(links.basket!.detailPath);
  const log = seller.getByTestId("event-log");
  for (const line of ["Payment link created", "Buyer opened the payment link", "started a MTN Mobile Money payment", "Payment of UGX 185,000 secured", "Seller marked the order as delivered", "Buyer confirmed the order arrived"]) {
    await expect(log).toContainText(line);
  }

  await seller.goto("/dashboard/transactions");
  await expect(seller.getByRole("table").getByRole("row")).toHaveCount(5); // header + 4
  await seller.getByPlaceholder("Search item, buyer or reference").fill("kitenge");
  await seller.getByRole("button", { name: "Search" }).click();
  await expect(seller.getByRole("table").getByRole("row")).toHaveCount(2);
  await expect(seller.getByRole("table")).toContainText("Kitenge dress size M");

  await seller.goto(`/dashboard/transactions?q=${links.sandals!.reference}`);
  await expect(seller.getByRole("table").getByRole("row")).toHaveCount(2);
  await expect(seller.getByRole("table")).toContainText("Beaded sandals");

  await seller.goto("/dashboard/transactions");
  await seller.getByRole("link", { name: /^Cancelled 2$/ }).click();
  await expect(seller).toHaveURL(/status=CANCELLED/);
  await expect(seller.getByRole("table").getByRole("row")).toHaveCount(3);
  await seller.goto("/dashboard/transactions?q=zzzz-no-match");
  await expect(seller.getByRole("heading", { name: "Nothing matches" })).toBeVisible();
});

test("role permissions: each role is kept to its own area, enforced on the server", async ({ browser }) => {
  // Signed-out visitors are sent to sign in.
  const anon = await guestContext(browser, false);
  const ap = await anon.newPage();
  for (const path of ["/dashboard", "/dashboard/transactions", "/admin", "/admin/users", "/purchases"]) {
    await ap.goto(path);
    await expect(ap, path).toHaveURL(/\/login/);
  }
  await anon.close();

  // A seller can't open admin or buyer areas.
  for (const path of ["/admin", "/admin/users", "/admin/transactions", "/purchases"]) {
    await seller.goto(path);
    await expect(seller.getByTestId("not-authorized"), path).toBeVisible();
  }

  // Another seller can't see this seller's transaction, even with its exact address.
  const bCtx = await browser.newContext(DESKTOP);
  const b = await bCtx.newPage();
  await register(b, sellerB, "seller");
  await b.waitForURL("**/dashboard");
  await dismissWelcome(b);
  const res = await b.goto(links.dress!.detailPath);
  expect(res?.status()).toBe(404);
  await expect(b.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await b.goto(`/t/${links.dress!.reference}`);
  await expect(b.getByRole("heading", { name: "We can't show this transaction" })).toBeVisible();
  await b.goto("/dashboard");
  await expect(b.getByRole("heading", { name: "No transactions yet" })).toBeVisible();
  await bCtx.close();

  // A buyer account can't open seller or admin areas, and a seller can't pay their own link.
  const buyerCtx = await browser.newContext(DESKTOP);
  const bp = await buyerCtx.newPage();
  await register(bp, buyer, "buyer");
  await bp.waitForURL("**/purchases");
  await dismissWelcome(bp);
  await expect(bp.getByRole("heading", { name: "No purchases yet" })).toBeVisible();
  for (const path of ["/dashboard", "/dashboard/links/new", "/admin"]) {
    await bp.goto(path);
    await expect(bp.getByTestId("not-authorized"), path).toBeVisible();
  }

  await createLink(seller, "phone", "Screen replacement", "60000");
  await seller.goto(links.phone!.payPath);
  await expect(seller.getByText("This is your own payment link")).toBeVisible();
  await expect(seller.getByTestId("open-pay")).toHaveCount(0);

  // A signed-in buyer pays; the order appears under their purchases.
  await bp.goto(links.phone!.payPath);
  await expect(bp.getByText(`Paying as ${buyer.name}`)).toBeVisible();
  await pay(bp, { outcome: "Succeeds", phone: "0782345678" });
  await bp.waitForURL(`**/t/${links.phone!.reference}`);
  await bp.goto("/purchases");
  await expect(bp.getByRole("table")).toContainText("Screen replacement");
  await expect(bp.getByRole("table")).toContainText("Nakato Crafts");
  await buyerCtx.close();
});

test("administrator: sees users and transactions, inspects details, and can suspend an account", async ({ browser }) => {
  const ctx = await browser.newContext(DESKTOP);
  const admin = await ctx.newPage();
  await login(admin, E2E_ENV.SEED_ADMIN_EMAIL, E2E_ENV.SEED_ADMIN_PASSWORD);
  await admin.waitForURL("**/admin");
  await dismissWelcome(admin);
  await expect(admin.getByTestId("admin-users-total")).toHaveText("4");
  await expect(admin.getByTestId("admin-tx-total")).toHaveText("5");
  await expect(admin.getByTestId("admin-stats")).toContainText("2 sellers · 1 buyers · 1 admins");

  await admin.goto("/admin/transactions");
  await expect(admin.getByRole("table").getByRole("row")).toHaveCount(6);
  await admin.getByPlaceholder("Search reference, item, buyer or seller").fill(links.basket!.reference);
  await admin.getByRole("button", { name: "Search" }).click();
  await expect(admin.getByRole("table").getByRole("row")).toHaveCount(2);
  await admin.getByRole("link", { name: links.basket!.reference }).click();
  await expect(admin.getByTestId("raw-status")).toHaveText("COMPLETED");
  await expect(admin.getByTestId("attempts")).toContainText("SUCCEEDED · DEMO · MTN Mobile Money");
  await expect(admin.getByTestId("event-log")).toContainText("Buyer confirmed the order arrived");

  await admin.goto("/admin/transactions?status=FUNDS_SECURED_DEMO");
  await expect(admin.getByRole("table").getByRole("row")).toHaveCount(3);

  await admin.goto("/admin/users");
  await expect(admin.getByTestId("users-list").getByRole("listitem")).toHaveCount(4);
  await admin.getByPlaceholder("Search name, email or business").fill("Okello");
  await admin.getByRole("button", { name: "Search" }).click();
  await expect(admin.getByTestId("users-list").getByRole("listitem")).toHaveCount(1);
  await admin.getByRole("button", { name: "Suspend" }).click();
  await admin.getByRole("button", { name: "Suspend account" }).click();
  await expect(admin.getByTestId(`status-${sellerB.email}`)).toHaveText("Suspended");
  await ctx.close();

  const bCtx = await browser.newContext(DESKTOP);
  const b = await bCtx.newPage();
  await login(b, sellerB.email, PASSWORD);
  await expect(b.getByText("This account has been suspended")).toBeVisible();
  await bCtx.close();
});

test("password reset: single-use emailed link changes the password", async ({ browser }) => {
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(sellerA.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto("/dev/outbox");
  const resetLink = page.getByTestId("outbox").getByRole("link").first();
  const href = await resetLink.getAttribute("href");
  expect(href).toContain("/reset-password/");
  await page.goto(new URL(href!).pathname);
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repeat new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.waitForURL("**/login?reset=1");
  await expect(page.getByText("Password updated")).toBeVisible();

  // The link can't be reused, the old password is dead, and the old session was signed out.
  await page.goto(new URL(href!).pathname);
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await login(page, sellerA.email, PASSWORD);
  await expect(page.getByText("That email and password don't match")).toBeVisible();
  await seller.goto("/dashboard");
  await expect(seller).toHaveURL(/\/login/);
  await login(seller, sellerA.email, NEW_PASSWORD);
  await seller.waitForURL("**/dashboard");
  await ctx.close();
});

test("mobile responsiveness: key screens fit a 375px phone with thumb-reachable navigation", async ({ browser }) => {
  const ctx = await browser.newContext({ ...MOBILE, storageState: await sellerCtx.storageState() });
  const page = await ctx.newPage();
  const paths = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/dashboard",
    "/dashboard/links",
    "/dashboard/links/new",
    "/dashboard/transactions",
    links.basket!.detailPath,
    links.dress!.detailPath,
    "/dashboard/settings",
    links.dress!.payPath,
    `/t/${links.basket!.reference}`,
  ];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  }

  await page.goto("/dashboard");
  const tabBar = page.getByRole("navigation", { name: "Main" });
  await expect(tabBar).toBeVisible();
  await expect(tabBar.getByRole("link", { name: "New payment link" })).toBeVisible();
  for (const name of ["Home", "Links", "Activity", "Account"]) {
    const box = await tabBar.getByRole("link", { name, exact: true }).boundingBox();
    expect(box!.height, `${name} tab height`).toBeGreaterThanOrEqual(44);
  }
  // Phones get stacked rows instead of a table.
  await expect(page.getByRole("table")).toBeHidden();
  await tabBar.getByRole("link", { name: "New payment link" }).click();
  await page.waitForURL("**/dashboard/links/new");
  const input = page.getByLabel("Item or service");
  const fontSize = await input.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16); // avoids iOS zoom on focus
  await ctx.close();
});
