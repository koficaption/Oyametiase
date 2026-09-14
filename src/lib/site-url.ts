function stripSlash(value: string) {
  return value.replace(/\/$/, "");
}

function withHttps(hostOrUrl: string) {
  const trimmed = stripSlash(hostOrUrl.trim());
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function isLocalHost(value: string) {
  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/.test(value);
  }
}

export function resolvePublicAppOrigin(input: {
  requestOrigin?: string | null;
  envUrl?: string | null;
  vercelProductionUrl?: string | null;
  vercelUrl?: string | null;
}) {
  const vercelProduction = input.vercelProductionUrl ? withHttps(input.vercelProductionUrl) : null;
  const vercelPreview = input.vercelUrl ? withHttps(input.vercelUrl) : null;
  const candidates = [input.requestOrigin, input.envUrl, vercelProduction, vercelPreview];
  const remote = candidates.find((value) => value && !isLocalHost(value));
  if (remote) return stripSlash(remote);
  const fallback = candidates.find((value) => Boolean(value));
  return stripSlash(fallback || "http://localhost:3000");
}

export async function publicAppOrigin() {
  const { headers } = await import("next/headers");
  let requestOrigin: string | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (isLocalHost(host) ? "http" : "https");
      requestOrigin = `${proto}://${host}`;
    }
  } catch {
    requestOrigin = null;
  }

  return resolvePublicAppOrigin({
    requestOrigin,
    envUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
}
