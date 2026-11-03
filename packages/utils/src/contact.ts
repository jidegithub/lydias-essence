/** Digits only, as wa.me expects. */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidWhatsappNumber(input: string): boolean {
  const digits = normalizePhoneDigits(input);
  return digits.length >= 8 && digits.length <= 15;
}

export function whatsappLink(number: string, message: string): string {
  const digits = normalizePhoneDigits(number);
  if (!digits) return "#";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input);
}

export function isHttpsUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "https:" && !!u.hostname.includes(".");
  } catch {
    return false;
  }
}
