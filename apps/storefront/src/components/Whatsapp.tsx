import type { AnchorHTMLAttributes, ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { whatsappLink as buildWhatsappLink } from "@lydias-essence/utils";
import { useSite } from "../context/SiteContext";

/** Returns a function that builds a WhatsApp link, or null when no number is set in the admin. */
export function useWhatsappLink() {
  const { whatsappNumber } = useSite();
  return (message: string): string | null =>
    whatsappNumber ? buildWhatsappLink(whatsappNumber, message) : null;
}

export function useWhatsappConfigured(): boolean {
  return Boolean(useSite().whatsappNumber);
}

interface WhatsappProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  message: string;
  children?: ReactNode;
}

export function Whatsapp({ message, children, onClick, ...props }: WhatsappProps) {
  const href = useWhatsappLink()(message);

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
