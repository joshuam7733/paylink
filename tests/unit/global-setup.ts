import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Builds a fresh test database from the real migrations before the unit tests run. */
export default function setup() {
  const dir = path.resolve(__dirname, "../../prisma/test");
  mkdirSync(dir, { recursive: true });
  for (const f of ["unit.db", "unit.db-journal"]) rmSync(path.join(dir, f), { force: true });
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: "file:./test/unit.db" },
    stdio: "pipe",
  });
}
