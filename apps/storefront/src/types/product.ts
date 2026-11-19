import type { ProductCategory } from "@lydias-essence/types";

// Product types and price helpers live in the shared workspace packages (also used by the admin).
export type { Product, ProductCategory } from "@lydias-essence/types";
export { formatNaira, getEffectivePrice } from "@lydias-essence/utils";

/** What the shopper can filter the collection by ("Saved" = their favourites). */
export type CategoryFilter = "All" | ProductCategory | "Saved";
