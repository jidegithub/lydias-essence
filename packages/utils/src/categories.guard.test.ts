import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@lydias-essence/types";

/**
 * Guards the "one list of categories" rule: names live in packages/types only.
 * If this fails, someone hard-coded a category (or revived a retired one).
 */
const root = resolve(__dirname, "../../..");
const SKIP = new Set(["node_modules", "dist", ".git"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const files = ["apps/admin/src", "apps/storefront/src", "packages"].flatMap((d) => sources(join(root, d)));
const read = (f: string) => readFileSync(f, "utf8");
const rel = (f: string) => f.replace(root + "/", "");

describe("single source of truth for categories", () => {
  it("defines the category list in exactly one place", () => {
    const definers = files.filter((f) => !f.endsWith(".test.ts") && read(f).includes("PRODUCT_CATEGORIES = ["));
    expect(definers.map(rel)).toEqual(["packages/types/src/index.ts"]);
  });

  it("never mentions the retired Skincare category in code", () => {
    const offenders = files.filter((f) => !f.endsWith(".test.ts") && /Skincare/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("keeps category names out of the storefront UI code (it must use the shared list)", () => {
    const app = read(join(root, "apps/storefront/src/App.tsx"));
    const hardCoded = PRODUCT_CATEGORIES.filter((c) => app.includes(`"${c}"`));
    expect(hardCoded).toEqual([]);
    expect(app).toContain("PRODUCT_CATEGORIES");
  });

  it("keeps category names out of the admin pages (they must use the shared list)", () => {
    const pages = files.filter((f) => f.includes("apps/admin/src"));
    const hardCoded = pages.filter((f) => PRODUCT_CATEGORIES.some((c) => read(f).includes(`"${c}"`)));
    expect(hardCoded.map(rel)).toEqual([]);
  });
});
