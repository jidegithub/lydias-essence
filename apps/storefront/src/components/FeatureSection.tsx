import { ArrowRight } from "lucide-react";
import { useSite } from "../context/SiteContext";
import { siteImages } from "../data/siteImages";
import { onImageError, safeUrl } from "../lib/storefront";
import type { Product } from "../types/product";
import { formatNaira, getEffectivePrice } from "../types/product";
import { themeBackground } from "@lydias-essence/utils";

interface FeatureSectionProps {
  /** Products the owner picked for this section (none = just the text and photo). */
  picks: Product[];
  onOpenProduct: (product: Product) => void;
}

/** "Your Beauty, Your Rules": wording, photo, on/off switch and product picks all come from the admin. */
export function FeatureSection({ picks, onOpenProduct }: FeatureSectionProps) {
  const { content } = useSite();
  const section = content.beautyRules;
  if (!section.enabled) return null;

  const image = safeUrl(section.imageUrl) ?? siteImages.feature.src;

  return (
    <section className="feature-section" id="story">
      <div className="feature-image">
        <img
          src={image}
          alt={siteImages.feature.alt}
          loading="lazy"
          onError={onImageError(siteImages.feature.src)}
        />
        <span className="feature-image-label">{section.imageLabel}</span>
      </div>

      <div className="feature-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.headingLine1}<br /><em>{section.headingLine2}</em></h2>
        <p>{section.paragraph1}</p>
        <p>{section.paragraph2}</p>

        {picks.length > 0 && (
          <ul className="feature-picks" aria-label="Featured products">
            {picks.map((item) => (
              <li key={item.id}>
                <button onClick={() => onOpenProduct(item)}>
                  <span
                    className="feature-pick-thumb"
                    style={{ background: themeBackground(item.background_theme) }}
                  >
                    {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
                  </span>
                  <span className="feature-pick-name">{item.name}</span>
                  <span className="feature-pick-price">{formatNaira(getEffectivePrice(item))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <a className="text-link" href="#collection">
          {section.linkLabel} <ArrowRight size={16} />
        </a>
        <span className="feature-signature">{section.signature}</span>
      </div>
    </section>
  );
}
