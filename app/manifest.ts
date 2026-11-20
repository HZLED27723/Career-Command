import type { MetadataRoute } from "next";

/** Web app manifest — makes CareerCommand installable as a PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareerCommand",
    short_name: "CareerCommand",
    description:
      "Your personal career command center — dual-track resumes, application tracker, interview prep and certifications.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e0d",
    theme_color: "#0b0e0d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      // Maskable wants a full-bleed square — the platform applies its own mask.
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
