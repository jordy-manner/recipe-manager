import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Recipe photo uploads (Cloudinary upload + the Gemini scan) post files to
    // Server Actions; the default 1 MB body cap is too small for photos. Images
    // are also downscaled client-side before sending (see the scan step).
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
