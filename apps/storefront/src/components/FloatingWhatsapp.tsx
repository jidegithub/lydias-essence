import { MessageCircle } from "lucide-react";
import { Whatsapp } from "./Whatsapp";

export function FloatingWhatsapp() {
  return (
    <Whatsapp
      className="floating-whatsapp"
      message="Hello Lydia's Essence! I'd like to make an enquiry."
      aria-label="Contact Lydia's Essence on WhatsApp"
    >
      <MessageCircle size={22} />
    </Whatsapp>
  );
}
