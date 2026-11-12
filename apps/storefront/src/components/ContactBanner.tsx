import { ArrowRight, MessageCircle } from "lucide-react";
import { Whatsapp, isWhatsappConfigured } from "./Whatsapp";

export function ContactBanner() {
  return (
    <section className="contact-banner" id="contact">
      <div className="contact-banner-decoration">✳</div>
      <span className="eyebrow">LET’S FIND YOUR FAVOURITE</span>
      <h2>A little help finding<br /><em>your essence?</em></h2>
      <p>
        Tell us what you love. We’ll help you discover something that feels
        just right.
      </p>

      <Whatsapp
        className="button button-light"
        message="Hello Lydia's Essence! I'd love some help finding my next favourite."
      >
        <MessageCircle size={17} />
        Chat with us on WhatsApp
        <ArrowRight size={16} />
      </Whatsapp>

      {!isWhatsappConfigured() && (
        <span className="contact-note">
          WhatsApp enquiries will be available once your business number is
          configured.
        </span>
      )}
    </section>
  );
}
