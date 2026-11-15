import { Check, Heart, Sparkles } from "lucide-react";
import { useSite } from "../context/SiteContext";

export function TrustStrip() {
  const { content } = useSite();
  const [first, second, third] = content.trustStrip;

  return (
    <section className="trust-strip" aria-label="Our values">
      <div><Sparkles size={18} /><span>{first}</span></div>
      <span className="strip-separator">✳</span>
      <div><Heart size={18} /><span>{second}</span></div>
      <span className="strip-separator">✳</span>
      <div><Check size={18} /><span>{third}</span></div>
    </section>
  );
}
