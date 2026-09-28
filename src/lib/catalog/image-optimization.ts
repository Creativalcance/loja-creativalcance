// Match the existing Next.js remote image allowlist. Other sources, including
// customer uploads and signed storage URLs, keep their original delivery path.
export function canOptimizeCatalogImage(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "https:" && url.hostname === "cdn.hideacontent.com" &&
      !url.port && !url.username && !url.password && url.pathname.startsWith("/public/products/");
  } catch {
    return false;
  }
}
