import { ArrowRight, MessageCircle } from "lucide-react";
import { useSite } from "../context/SiteContext";
import { Whatsapp, useWhatsappConfigured } from "./Whatsapp";

export function ContactBanner() {
  const { content, settings } = useSite();
  const banner = content.contactBanner;
  const configured = useWhatsappConfigured();

  return (
    <section className="contact-banner" id="contact">
      <div className="contact-banner-decoration">✳</div>
      <span className="eyebrow">{banner.eyebrow}</span>
      <h2>{banner.headingLine1}<br /><em>{banner.headingLine2}</em></h2>
      <p>{banner.description}</p>

      <Whatsapp
        className="button button-light"
        message="Hello Lydia's Essence! I'd love some help finding my next favourite."
      >
        <MessageCircle size={17} />
        {banner.buttonLabel}
        <ArrowRight size={16} />
      </Whatsapp>

      {!configured && (
        <span className="contact-note">
          WhatsApp enquiries will be available once your business number is
          configured.
        </span>
      )}

      {(settings.contact_email || settings.contact_phone) && (
        <div className="contact-details">
          {settings.contact_email && (
            <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
          )}
          {settings.contact_phone && (
            <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`}>
              {settings.contact_phone}
            </a>
          )}
        </div>
      )}
    </section>
  );
}
