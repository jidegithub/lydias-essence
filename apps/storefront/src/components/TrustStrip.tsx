import { Check, Heart, Sparkles } from "lucide-react";

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Our values">
      <div><Sparkles size={18} /><span>Curated with care</span></div>
      <span className="strip-separator">✳</span>
      <div><Heart size={18} /><span>Everyday indulgence</span></div>
      <span className="strip-separator">✳</span>
      <div><Check size={18} /><span>Personalised enquiries</span></div>
    </section>
  );
}
