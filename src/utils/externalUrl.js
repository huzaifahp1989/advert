const PLACEHOLDER_LINK = /^(?:#|https?:\/+#?|https?:\/\/#?)$/i;

function looksAbsoluteHttp(value) {
  return /^https?:\/+/i.test(value);
}

/**
 * Returns a safe http(s) URL string, or undefined when the input cannot be opened.
 * Rejects placeholders like "#", "https://#", and "https:/#" that crash window.open
 * in mobile WebViews.
 */
export function resolveExternalUrl(raw, baseUrl) {
  if (raw == null) return undefined;
  const value = String(raw).trim();
  if (!value || PLACEHOLDER_LINK.test(value)) return undefined;

  // Absolute-looking values with a missing host (https:/#, https://#) are never safe.
  // Resolve them without a base URL so they are not rewritten to the current origin.
  if (looksAbsoluteHttp(value)) {
    try {
      const absolute = new URL(value);
      if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
        return undefined;
      }
      if (!absolute.hostname) return undefined;
      return absolute.href;
    } catch {
      return undefined;
    }
  }

  try {
    const base =
      baseUrl ??
      (typeof window !== "undefined" ? window.location.href : "https://localhost/");
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function openExternalUrl(raw, target = "_blank", features) {
  if (typeof window === "undefined") return null;
  const safe = resolveExternalUrl(raw);
  if (!safe) return null;
  try {
    return window.open(safe, target, features ?? "noopener,noreferrer");
  } catch (error) {
    console.warn("Blocked window.open for invalid URL:", raw, error);
    return null;
  }
}

export function externalHref(raw, baseUrl) {
  return resolveExternalUrl(raw, baseUrl);
}

export function isIgnorableOpenError(message) {
  const text = String(message ?? "");
  return (
    /Failed to execute ['"]open['"] on ['"]Window['"]/i.test(text) &&
    /invalid URL/i.test(text)
  );
}
