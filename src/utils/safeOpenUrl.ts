const BLOCKED_LINKS = new Set(["#", "https:/#", "http:/#"]);

function normalizeLink(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}

export function isOpenableUrl(raw: string | null | undefined): boolean {
  const value = normalizeLink(raw);
  if (!value || value === "#" || BLOCKED_LINKS.has(value)) {
    return false;
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // Reject malformed hosts like "https:/#".
    if (!parsed.hostname) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function resolveOpenableUrl(
  raw: string | null | undefined,
  baseUrl = window.location.origin,
): string | null {
  const value = normalizeLink(raw);
  if (!isOpenableUrl(value)) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export function safeOpenUrl(
  raw: string | null | undefined,
  target = "_blank",
  features?: string,
): Window | null {
  const url = resolveOpenableUrl(raw);
  if (!url) {
    return null;
  }

  try {
    return window.open(url, target, features);
  } catch (error) {
    console.warn("Blocked window.open for invalid URL:", raw, error);
    return null;
  }
}

export function installSafeOpenPatch(): void {
  if (typeof window === "undefined" || (window as Window & { __advertSafeOpenPatched?: boolean }).__advertSafeOpenPatched) {
    return;
  }

  const originalOpen = window.open.bind(window);

  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const candidate = typeof url === "string" ? url : url?.toString() ?? "";
    const safeUrl = resolveOpenableUrl(candidate);
    if (!safeUrl) {
      if (candidate) {
        console.warn("Blocked invalid window.open URL:", candidate);
      }
      return null;
    }

    return originalOpen(safeUrl, target, features);
  }) as typeof window.open;

  (window as Window & { __advertSafeOpenPatched?: boolean }).__advertSafeOpenPatched = true;
}
