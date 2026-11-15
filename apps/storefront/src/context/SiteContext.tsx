import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteContent, SiteSettings } from "@lydias-essence/types";
import { resolveSiteContent, typographic } from "@lydias-essence/utils";
import { safeUrl } from "../lib/storefront";

export interface SocialLink {
  label: string;
  url: string;
}

/** Everything the owner controls in the admin, ready to use in any component. */
export interface Site {
  settings: SiteSettings;
  /** Wording for every section; blanks are already filled with the original text. */
  content: SiteContent;
  storeName: string;
  logoUrl: string | null;
  /** Digits only; empty when no WhatsApp number is configured. */
  whatsappNumber: string;
  socialLinks: SocialLink[];
  /** Whether "Special price" labels and crossed-out prices are shown. */
  showDiscount: boolean;
  /** False only on a first-ever visit, until the settings arrive. */
  ready: boolean;
}

const SiteContext = createContext<Site | null>(null);

// Fallback only: the real number is set in the admin (Brand & contact).
const envWhatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";

export function SiteProvider({
  settings,
  ready,
  children
}: {
  settings: SiteSettings;
  ready: boolean;
  children: ReactNode;
}) {
  const value = useMemo<Site>(
    () => ({
      settings,
      content: resolveSiteContent(settings.content),
      storeName: typographic(settings.store_name || "Lydia’s Essence"),
      logoUrl: safeUrl(settings.logo_url),
      whatsappNumber: (settings.whatsapp_number || envWhatsappNumber).replace(/\D/g, ""),
      socialLinks: (
        [
          ["Instagram", settings.instagram_url],
          ["Facebook", settings.facebook_url],
          ["TikTok", settings.tiktok_url]
        ] as [string, string][]
      )
        .map(([label, url]) => ({ label, url: safeUrl(url) }))
        .filter((link): link is SocialLink => link.url !== null),
      showDiscount: settings.show_discount_badge,
      ready
    }),
    [settings, ready]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): Site {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useSite must be used inside <SiteProvider>");
  return site;
}
