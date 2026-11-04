/** Shared types for the Lydia's Essence storefront and admin dashboard. */

export const PRODUCT_CATEGORIES = ["Jewelries", "Perfumes", "Beauty", "Glasses"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Keys map to CSS variables defined in @lydias-essence/ui/theme.css (--theme-<key>). */
export const BACKGROUND_THEMES = ["default", "blush", "sage", "sand", "stone"] as const;
export type BackgroundTheme = (typeof BACKGROUND_THEMES)[number];

export type MediaKind = "image" | "frame_360";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  price: number;
  sale_price: number | null;
  discount_enabled: boolean;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  image_urls: string[];
  published: boolean;
  published_at: string | null;
  specifications: Record<string, unknown>;
  background_theme: BackgroundTheme;
  is_featured: boolean;
  recommendation_eligible: boolean;
  has_360: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  kind: MediaKind;
  storage_path: string | null;
  public_url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export type MerchSection = "beauty_rules" | "next_favourite";

export interface MerchSlot {
  id: string;
  section: MerchSection;
  product_id: string;
  position: number;
}

export interface SiteContent {
  topBanner: { leftText: string; rightText: string };
  hero: {
    eyebrow: string;
    headingLine1: string;
    headingLine2: string;
    description: string;
    buttonLabel: string;
    secondaryLabel: string;
    note: string;
    floatingNote: string;
    imageUrl: string;
  };
  trustStrip: [string, string, string];
  collection: { eyebrow: string; headingLead: string; headingEmphasis: string; description: string };
  beautyRules: {
    enabled: boolean;
    eyebrow: string;
    headingLine1: string;
    headingLine2: string;
    paragraph1: string;
    paragraph2: string;
    linkLabel: string;
    signature: string;
    imageUrl: string;
    imageLabel: string;
  };
  nextFavourite: {
    enabled: boolean;
    eyebrow: string;
    headingLead: string;
    headingEmphasis: string;
    linkLabel: string;
  };
  contactBanner: {
    eyebrow: string;
    headingLine1: string;
    headingLine2: string;
    description: string;
    buttonLabel: string;
  };
  footer: { tagline: string; bottomCenter: string; bottomRight: string };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface SiteSettings {
  id: 1;
  store_name: string;
  logo_url: string | null;
  whatsapp_number: string;
  contact_email: string;
  contact_phone: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  low_stock_threshold: number;
  announcement_enabled: boolean;
  announcement_text: string;
  show_discount_badge: boolean;
  content: DeepPartial<SiteContent>;
  updated_at: string;
}

/** Everything the public storefront needs in one object. */
export interface StorefrontData {
  products: Product[];
  settings: SiteSettings;
  /** Products chosen for "Your Beauty, Your Rules", in display order (published only). */
  beautyRules: Product[];
  /** Products chosen for "Your Next Favourite", in display order (published only). */
  nextFavourite: Product[];
  /** True when no "Your Next Favourite" selection has ever been saved. */
  nextFavouriteUnconfigured: boolean;
}
