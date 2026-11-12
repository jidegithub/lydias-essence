import { motion } from "framer-motion";
import { ArrowDown, ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";
import { siteImages } from "../data/siteImages";

export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-copy">
        <motion.span
          className="eyebrow hero-eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          YOUR DAILY DOSE OF BEAUTY
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          A little luxury.
          <br />
          <em>A lot of you.</em>
        </motion.h1>

        <motion.p
          className="hero-description"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Thoughtfully chosen jewellery, captivating scents, beauty essentials
          and frames that feel like you.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a className="button button-dark" href="#collection">
            Discover the collection <ArrowRight size={17} />
          </a>
          <a className="text-link" href="#story">
            Our philosophy <ArrowDownRight size={16} />
          </a>
        </motion.div>

        <div className="hero-note">
          <span className="hero-note-star">✳</span>
          <span>Feel good in your own essence.</span>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-image">
          <img src={siteImages.hero.src} alt={siteImages.hero.alt} />
        </div>
        <div className="hero-floating-note">
          <Sparkles size={16} />
          <span>Made for your moments</span>
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
