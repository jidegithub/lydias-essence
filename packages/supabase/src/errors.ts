export type FriendlyKind = "auth" | "permission" | "network" | "validation" | "conflict" | "schema" | "unknown";

export class FriendlyError extends Error {
  readonly kind: FriendlyKind;
  readonly code?: string;
  constructor(message: string, kind: FriendlyKind = "unknown", code?: string) {
    super(message);
    this.name = "FriendlyError";
    this.kind = kind;
    this.code = code;
  }
}

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: string | number;
  details?: string;
}

/** Turns Supabase/PostgREST/Storage errors into messages a shop owner can act on. */
export function toFriendlyError(err: unknown, fallback = "Something went wrong. Please try again."): FriendlyError {
  if (err instanceof FriendlyError) return err;
  const e = (typeof err === "object" && err !== null ? err : { message: String(err) }) as ErrorLike;
  const message = e.message ?? "";
  const code = e.code;
  const lower = message.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed") || lower.includes("network request failed")) {
    return new FriendlyError("We couldn’t reach the server. Check your internet connection and try again.", "network", code);
  }
  if (code === "PGRST301" || code === "PGRST303" || lower.includes("jwt expired") || lower.includes("invalid jwt")) {
    return new FriendlyError("Your session has expired. Please sign in again.", "auth", code);
  }
  if (code === "42501" || lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("not authorized")) {
    return new FriendlyError("You don’t have permission to do that. Sign in with an administrator account.", "permission", code);
  }
  if (code === "23505") {
    if (lower.includes("slug")) {
      return new FriendlyError("Another product already uses that web address. Choose a different one.", "conflict", code);
    }
    return new FriendlyError("That already exists. Try a different value.", "conflict", code);
  }
  if (code === "23514") {
    return new FriendlyError("One of the values isn’t allowed. Check the prices, stock and dates.", "validation", code);
  }
  if (code === "23503") {
    return new FriendlyError("That item is linked to something that no longer exists. Refresh the page and try again.", "conflict", code);
  }
  if (code === "P0001") {
    // Our own database functions raise readable messages.
    return new FriendlyError(message || fallback, "validation", code);
  }
  if (code === "PGRST116") {
    return new FriendlyError("That item couldn’t be found, or you don’t have permission to change it.", "permission", code);
  }
  if (code === "42703" || code === "42P01" || code === "PGRST204" || code === "PGRST202" || code === "PGRST205") {
    return new FriendlyError("The database hasn’t been updated for this feature yet. Ask your developer to apply the latest migrations.", "schema", code);
  }
  if (String(e.statusCode) === "413" || lower.includes("exceeded the maximum allowed size") || lower.includes("payload too large")) {
    return new FriendlyError("That file is too large. Images must be under 5 MB.", "validation", code);
  }
  if (lower.includes("mime type") || lower.includes("not supported") && lower.includes("type")) {
    return new FriendlyError("That file type isn’t allowed. Use JPG, PNG, WebP or AVIF.", "validation", code);
  }
  if (lower.includes("invalid login credentials")) {
    return new FriendlyError("That email and password don’t match. Check them and try again.", "auth", code);
  }
  if (lower.includes("email not confirmed")) {
    return new FriendlyError("This email address hasn’t been confirmed yet. Check your inbox for the confirmation link.", "auth", code);
  }
  if (e.status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return new FriendlyError("Too many attempts. Wait a minute and try again.", "unknown", code);
  }
  return new FriendlyError(message && message.length < 160 ? `${fallback} (${message})` : fallback, "unknown", code);
}
