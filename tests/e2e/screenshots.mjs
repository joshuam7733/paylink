// Captures review screenshots of the main screens. Usage (with the app running on :3100 against
// the e2e database): node tests/e2e/screenshots.mjs <output-folder>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "test-results/screens");
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:3100";
const id = Date.now().toString(36);
const password = "Screens-Pass-123";

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const desktop = await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 900 } });
const page = await desktop.newPage();
const shot = (p, name, full = true) => p.screenshot({ path: path.join(out, `${name}.png`), fullPage: full });

await page.goto("/");
await page.waitForLoadState("networkidle");
await shot(page, "01-landing-desktop");

await page.goto("/register");
await page.getByLabel("Full name").fill("Sarah Nakato");
await page.getByLabel("Business or shop name").fill("Nakato Crafts");
await page.getByLabel("Email").fill(`screens-${id}@paylink.test`);
await page.getByLabel("Password").fill(password);
await shot(page, "02-register-desktop");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL("**/dashboard");
await page.getByRole("button", { name: "Start exploring" }).click();
await page.waitForTimeout(500);
await shot(page, "03-dashboard-empty");

const items = [
  ["Handwoven raffia basket set (3)", "185000"],
  ["Kitenge dress, size M", "95000"],
  ["Screen replacement", "60000"],
  ["Beaded sandals", "55000"],
];
const made = [];
for (const [item, amount] of items) {
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Item or service").fill(item);
  await page.getByLabel("Description").fill("Set of three nesting baskets, natural and indigo. Largest is 35 cm across. Made to order in Kampala.");
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByLabel("Delivery area").fill("Kampala and Wakiso");
  if (made.length === 0) {
    await page.getByLabel("Amount", { exact: true }).blur();
    await shot(page, "04-new-link-desktop");
  }
  await page.getByRole("button", { name: "Create payment link" }).click();
  await page.waitForURL(/created=1/);
  if (made.length === 0) await shot(page, "05-link-created");
  made.push({ pay: new URL((await page.getByTestId("pay-url").innerText()).trim()).pathname, detail: new URL(page.url()).pathname });
}

const phone = await browser.newContext({ baseURL: base, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const m = await phone.newPage();
async function pay(i, outcome, name, number) {
  await m.goto(made[i].pay);
  await m.waitForLoadState("networkidle");
  if (i === 0) await shot(m, "06-checkout-phone");
  await m.getByTestId("open-pay").click();
  const d = m.getByRole("dialog");
  await d.getByLabel("Mobile money number").fill(number);
  await d.getByLabel("Your name").fill(name);
  await d.getByText(outcome, { exact: true }).click();
  await m.waitForTimeout(500);
  if (i === 0) await shot(m, "07-pay-sheet-phone", false);
  await d.locator('button[type="submit"]').click();
}
await pay(0, "Succeeds", "Grace Akello", "0772123456");
await m.waitForURL("**/t/**");
await m.waitForTimeout(600);
await shot(m, "08-tracking-secured-phone");
await pay(1, "Succeeds", "Esther Nambi", "0701234567");
await m.waitForURL("**/t/**");
const track2 = new URL(m.url()).pathname;
await pay(2, "Fails", "Brian Kato", "0751234567");
await m.waitForTimeout(1500);
await shot(m, "09-pay-failed-phone", false);

await page.goto(made[1].detail);
await page.getByRole("button", { name: "Mark as delivered" }).click();
await page.waitForTimeout(800);
await m.goto(track2);
await m.getByRole("button", { name: "I've received my order" }).click();
await m.waitForTimeout(500);
await shot(m, "10-confirm-dialog-phone", false);
await m.getByRole("button", { name: "Confirm received" }).click();
await m.waitForTimeout(1200);
await shot(m, "11-tracking-completed-phone");

await page.goto("/dashboard");
await page.waitForLoadState("networkidle");
await shot(page, "12-dashboard-desktop");
await page.goto(made[0].detail);
await shot(page, "13-transaction-detail-desktop");
await page.goto("/dashboard/transactions");
await shot(page, "14-transactions-desktop");
await page.goto("/dashboard/links");
await shot(page, "15-links-desktop");

const sellerPhone = await browser.newContext({ baseURL: base, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, storageState: await desktop.storageState() });
const sp = await sellerPhone.newPage();
await sp.goto("/dashboard");
await sp.waitForLoadState("networkidle");
await shot(sp, "16-dashboard-phone", false);
await sp.goto("/dashboard/links/new");
await shot(sp, "17-new-link-phone");
await sp.goto("/");
await shot(sp, "18-landing-phone");

await browser.close();
console.log(`Saved screenshots to ${out}`);
