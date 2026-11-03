import type { DeepPartial, SiteContent } from "@lydias-essence/types";

/** Wording the storefront shipped with. Used whenever the owner hasn't changed something. */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  topBanner: {
    leftText: "THE ART OF EVERYDAY INDULGENCE",
    rightText: "BEAUTY, WITH INTENTION."
  },
  hero: {
    eyebrow: "YOUR DAILY DOSE OF BEAUTY",
    headingLine1: "A little luxury.",
    headingLine2: "A lot of you.",
    description: "Thoughtfully chosen skincare, captivating scents, beauty essentials and frames that feel like you.",
    buttonLabel: "Discover the collection",
    secondaryLabel: "Our philosophy",
    note: "Feel good in your own essence.",
    floatingNote: "Made for your moments",
    imageUrl: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1200&q=90"
  },
  trustStrip: ["Curated with care", "Everyday indulgence", "Personalised enquiries"],
  collection: {
    eyebrow: "THE LYDIA\u2019S EDIT",
    headingLead: "Find your",
    headingEmphasis: "essence.",
    description: "Little things that make you feel a little more you."
  },
  beautyRules: {
    enabled: true,
    eyebrow: "MORE THAN A ROUTINE",
    headingLine1: "Your beauty.",
    headingLine2: "Your rules.",
    paragraph1:
      "We believe beauty is personal. It lives in the little rituals, the familiar scent, the perfect frame, and the moments you make entirely your own.",
    paragraph2:
      "Lydia\u2019s Essence brings together considered beauty and everyday indulgence, so finding your favourites feels just as lovely as using them.",
    linkLabel: "Explore the edit",
    signature: "Your essence, always.",
    imageUrl: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=85",
    imageLabel: "THE EVERYDAY RITUAL"
  },
  nextFavourite: {
    enabled: true,
    eyebrow: "A GOOD PLACE TO START",
    headingLead: "Your next",
    headingEmphasis: "favourite.",
    linkLabel: "Shop everything"
  },
  contactBanner: {
    eyebrow: "LET\u2019S FIND YOUR FAVOURITE",
    headingLine1: "A little help finding",
    headingLine2: "your essence?",
    description: "Tell us what you love. We\u2019ll help you discover something that feels just right.",
    buttonLabel: "Chat with us on WhatsApp"
  },
  footer: {
    tagline: "Thoughtful beauty for\nyour everyday moments.",
    bottomCenter: "Made for your moments.",
    bottomRight: "Prices displayed in Nigerian naira (\u20A6)."
  }
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function merge(base: unknown, override: unknown): unknown {
  if (isPlainObject(base)) {
    const out: Record<string, unknown> = {};
    const o = isPlainObject(override) ? override : {};
    for (const key of Object.keys(base)) out[key] = merge(base[key], o[key]);
    return out;
  }
  if (Array.isArray(base)) {
    return Array.isArray(override) && override.length === base.length && override.every((x) => typeof x === "string" && x.trim())
      ? override
      : base;
  }
  if (typeof base === "string") return typeof override === "string" && override.trim() ? override : base;
  if (typeof base === "boolean") return typeof override === "boolean" ? override : base;
  return base;
}

/** Fills any missing or blank value with the default so the storefront never shows an empty heading. */
export function resolveSiteContent(stored: DeepPartial<SiteContent> | null | undefined): SiteContent {
  return merge(DEFAULT_SITE_CONTENT, stored ?? {}) as SiteContent;
}
