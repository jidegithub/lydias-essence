import type { AnchorHTMLAttributes, ReactNode } from "react";
import { MessageCircle } from "lucide-react";

const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export function whatsappLink(message: string): string | null {
  if (!whatsappNumber) return null;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

interface WhatsappProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  message: string;
  children?: ReactNode;
}

export function Whatsapp({ message, children, onClick, ...props }: WhatsappProps) {
  const href = whatsappLink(message);

  return (
    <a
      {...props}
      href={href ?? undefined}
      target={props.target ?? "_blank"}
      rel={props.rel ?? "noreferrer"}
      onClick={(event) => {
        if (!href) event.preventDefault();
        onClick?.(event);
      }}
    >
      {children ?? <><MessageCircle size={17} /> Chat with us</>}
    </a>
  );
}

export function isWhatsappConfigured() {
  return Boolean(whatsappNumber);
}
