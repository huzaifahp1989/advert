export function resolveExternalUrl(raw, baseUrl) {
  if (raw == null) return undefined;
  const value = String(raw).trim();
  if (!value || value === "#") return undefined;

  try {
    const base =
      baseUrl ?? (typeof window !== "undefined" ? window.location.href : "https://localhost/");
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname || url.hostname === "#") return undefined;
    return url.href;
  } catch {
    if (!/^https?:\/\//i.test(value)) return undefined;
    if (/^https?:\/\/#?$/i.test(value) || /^https?:\/#$/i.test(value)) return undefined;
    return value;
  }
}

export function openExternalUrl(raw, target = "_blank", features) {
  if (typeof window === "undefined") return null;
  const safe = resolveExternalUrl(raw);
  if (!safe) return null;
  return window.open(safe, target, features ?? "noopener,noreferrer");
}

export function externalHref(raw, baseUrl) {
  return resolveExternalUrl(raw, baseUrl);
}
