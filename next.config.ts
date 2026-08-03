import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server runs inside WSL2 while the browser is on Windows, so requests
  // for /_next/* arrive from the WSL interface IP and are treated as cross-origin.
  // Without this, client chunks and HMR are blocked and nothing hydrates.
  // Dev-only setting; ignored in production builds.
  allowedDevOrigins: ["172.28.235.15"],

  // Nothing here uses next/image, but /_next/image is exposed regardless and is
  // exempt from the auth proxy. Turning optimization off retires that endpoint
  // rather than leaving sharp's libvips CVEs reachable for no benefit.
  images: { unoptimized: true },
};

export default nextConfig;
