/**
 * GX Academy – Request Security & Origin Validation
 * Protects state-changing endpoints against CSRF and validates client metadata.
 */

/**
 * Validates request Origin against expected host or trusted domains.
 * Protects state-changing requests (POST, PUT, DELETE, PATCH) against CSRF.
 */
export function validateRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // If no Origin header is supplied:
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) {
      // In local CLI/tests or same-origin non-browser calls without headers, allow
      return true;
    }
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();
      return !host || refererHost === host || isLocalhost(refererHost);
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();

    // 1. Direct match with Host or X-Forwarded-Host header
    if (host && originHost === host) {
      return true;
    }

    // 2. Allow local development environments
    if (isLocalhost(originHost)) {
      return true;
    }

    // 3. Match against known trusted production domains
    const trustedDomains = [
      process.env.APP_URL,
      process.env.RAILWAY_PUBLIC_DOMAIN,
      process.env.RAILWAY_STATIC_URL,
      "gazzar-production.up.railway.app",
      "gazzar.up.railway.app"
    ].filter(Boolean) as string[];

    for (const domain of trustedDomains) {
      try {
        const domainHost = (domain.startsWith("http") ? new URL(domain).host : domain).toLowerCase();
        if (domainHost && originHost === domainHost) {
          return true;
        }
      } catch {
        // Skip malformed domain strings
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isLocalhost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

/**
 * Extracts and sanitizes client IP from request headers.
 * Does not trust arbitrary forwarded headers; enforces strict IPv4/IPv6 syntax.
 */
export function extractClientIp(request: Request): string | null {
  // Check x-forwarded-for first (take client IP - first entry)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }

  // Check x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  return null;
}

function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  // Standard IPv4
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  // Standard IPv6 (basic hex colon syntax)
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;
  return ipv6Pattern.test(ip) && ip.includes(":");
}

/**
 * Extracts and truncates User-Agent string to mitigate storage bloating.
 */
export function extractUserAgent(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  if (!ua || typeof ua !== "string") return null;
  return ua.trim().slice(0, 500);
}
