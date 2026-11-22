import type { NextConfig } from "next";

/**
 * Privacy and security headers on every response (§7.31).
 *
 * - Referrer-Policy same-origin: links and requests to other sites (company
 *   websites, the logo service, Google Calendar) don't learn which page of the
 *   app they came from.
 * - X-Frame-Options DENY: no other site can load the app inside a frame and
 *   trick someone into clicking (clickjacking).
 * - Permissions-Policy: the app never needs the camera, microphone or
 *   location, so no page — or anything injected into one — can ask for them.
 *
 * No Content-Security-Policy yet: the pre-paint theme script, the PDF worker
 * and blob previews would each need allowances, and a wrong policy breaks the
 * app silently. Worth adding with testing of its own.
 */
const SECURITY_HEADERS = [
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
