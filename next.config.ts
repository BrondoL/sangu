import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server runs inside WSL2 while the browser is on Windows, so requests
  // for /_next/* arrive from the WSL interface IP and are treated as cross-origin.
  // Without this, client chunks and HMR are blocked and nothing hydrates.
  // Dev-only setting; ignored in production builds.
  allowedDevOrigins: ["172.28.235.15"],
};

export default nextConfig;
