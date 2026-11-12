// Builds a fresh end-to-end database from the real migrations and seeds the administrator.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "prisma", "test");
mkdirSync(dir, { recursive: true });
for (const f of ["e2e.db", "e2e.db-journal"]) rmSync(path.join(dir, f), { force: true });

const run = (cmd) => execSync(cmd, { cwd: root, env: process.env, stdio: "inherit" });
run("npx prisma migrate deploy");
run("npx prisma db seed");
