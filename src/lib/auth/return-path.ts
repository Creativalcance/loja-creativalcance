// Only local application paths may cross the authentication boundary.
export function safeReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(path)) return undefined;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return undefined;
    const url = new URL(path, "https://store.invalid");
    if (url.origin !== "https://store.invalid") return undefined;
    const normalized = url.pathname.replace(/^\/(en|fr|es|de|it)(?=\/|$)/, "");
    if (/^\/(login|registo|logout|auth)(\/|$)/.test(normalized)) return undefined;
    return url.pathname + url.search + url.hash;
  } catch { return undefined; }
}

export function canReturnTo(role: string | null | undefined, path: string): boolean {
  const normalized = new URL(path, "https://store.invalid").pathname.replace(/^\/(en|fr|es|de|it)(?=\/|$)/, "");
  if (/^\/(admin|api\/admin)(\/|$)/.test(normalized)) return role === "admin";
  if (/^\/area-comercial(\/|$)/.test(normalized)) return role === "sales";
  if (/^\/area-cliente(\/|$)/.test(normalized)) return role === "customer";
  return true;
}
