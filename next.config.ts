import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://wa.me",
      "frame-ancestors 'none'",
    ];
    if (process.env.NODE_ENV === "production") {
      contentSecurityPolicy.push("upgrade-insecure-requests");
    }

    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Content-Security-Policy", value: contentSecurityPolicy.join("; ") },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
    useTypeScriptCli: false,
    proxyClientMaxBodySize: "6mb",
    cpus: 1,
    webpackBuildWorker: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: process.env.CLOUDINARY_CLOUD_NAME ? {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**` }],
  } : undefined,
};

export default nextConfig;
