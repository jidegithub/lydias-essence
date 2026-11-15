import { motion } from "framer-motion";
import { ArrowDown, ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";
import { useSite } from "../context/SiteContext";
import { siteImages } from "../data/siteImages";
import { onImageError, safeUrl } from "../lib/storefront";

export function Hero() {
  const { content, ready } = useSite();
  const hero = content.hero;
  const image = safeUrl(hero.imageUrl) ?? siteImages.hero.src;

  return (
    <section className="hero" id="home">
      <div className="hero-copy">
        <motion.span
          className="eyebrow hero-eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {hero.eyebrow}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {hero.headingLine1}
          <br />
          <em>{hero.headingLine2}</em>
        </motion.h1>

        <motion.p
          className="hero-description"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {hero.description}
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a className="button button-dark" href="#collection">
            {hero.buttonLabel} <ArrowRight size={17} />
          </a>
          <a className="text-link" href="#story">
            {hero.secondaryLabel} <ArrowDownRight size={16} />
          </a>
        </motion.div>

        <div className="hero-note">
          <span className="hero-note-star">✳</span>
          <span>{hero.note}</span>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-image">
          {/* Held back on a first-ever visit so the built-in photo is never downloaded then swapped. */}
          {ready && (
            <img
              src={image}
              alt={siteImages.hero.alt}
              onError={onImageError(siteImages.hero.src)}
            />
          )}
        </div>
        <div className="hero-floating-note">
          <Sparkles size={16} />
          <span>{hero.floatingNote}</span>
        </div>
        <div className="hero-index">01 / YOUR ESSENCE</div>
      </div>

      <a className="hero-scroll" href="#collection">
        <span>SCROLL TO DISCOVER</span>
        <ArrowDown size={15} />
      </a>
    </section>
  );
}
