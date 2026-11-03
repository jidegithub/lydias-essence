import { BACKGROUND_THEMES, type BackgroundTheme } from "@lydias-essence/types";

export const BACKGROUND_THEME_LABELS: Record<BackgroundTheme, string> = {
  default: "Soft paper",
  blush: "Blush rose",
  sage: "Quiet sage",
  sand: "Warm sand",
  stone: "Pale stone"
};

export function isBackgroundTheme(value: unknown): value is BackgroundTheme {
  return typeof value === "string" && (BACKGROUND_THEMES as readonly string[]).includes(value);
}

/** CSS value for a product's image background; the colours live in theme.css. */
export function themeBackground(theme: unknown): string {
  return `var(--theme-${isBackgroundTheme(theme) ? theme : "default"})`;
}
