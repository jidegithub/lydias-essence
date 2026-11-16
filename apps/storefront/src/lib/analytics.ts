/**
 * Cloudflare Web Analytics: free, no cookies, no fingerprinting. Shows visits, page views, countries,
 * devices, referrers and page-speed scores in the Cloudflare dashboard.
 *
 * It only loads when VITE_CF_ANALYTICS_TOKEN is set (a build variable), and never in development,
 * so local work doesn't pollute your numbers. No token = nothing is added to the page.
 */
export function initAnalytics(): void {
  if (import.meta.env.DEV) return;
  const token = String(import.meta.env.VITE_CF_ANALYTICS_TOKEN ?? "").trim();
  if (!token) return;

  // The token is a short code (letters and numbers). Anything else is a copy-paste mistake,
  // e.g. the whole <script> snippet pasted instead of just the token.
  if (!/^[a-z0-9]{16,64}$/i.test(token)) {
    console.warn("VITE_CF_ANALYTICS_TOKEN doesn't look like a Cloudflare Web Analytics token; analytics is off.");
    return;
  }
  if (document.querySelector("script[data-cf-beacon]")) return;

  const script = document.createElement("script");
  script.type = "module";
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  document.head.appendChild(script);
}
