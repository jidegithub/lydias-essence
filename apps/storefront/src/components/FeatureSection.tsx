import { ArrowRight } from "lucide-react";
import { siteImages } from "../data/siteImages";

export function FeatureSection() {
  return (
    <section className="feature-section" id="story">
      <div className="feature-image">
        <img
          src={siteImages.feature.src}
          alt={siteImages.feature.alt}
          loading="lazy"
        />
        <span className="feature-image-label">THE EVERYDAY RITUAL</span>
      </div>

      <div className="feature-copy">
        <span className="eyebrow">MORE THAN A ROUTINE</span>
        <h2>Your beauty.<br /><em>Your rules.</em></h2>
        <p>
          We believe beauty is personal. It lives in the little rituals, the
          familiar scent, the perfect frame, and the moments you make entirely
          your own.
        </p>
        <p>
          Lydia’s Essence brings together considered beauty and everyday
          indulgence, so finding your favourites feels just as lovely as using
          them.
        </p>
        <a className="text-link" href="#collection">
          Explore the edit <ArrowRight size={16} />
        </a>
        <span className="feature-signature">Your essence, always.</span>
      </div>
    </section>
  );
}
