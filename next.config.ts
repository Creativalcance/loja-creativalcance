import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./public/legal/**/*.json"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      // The route validates UUIDs, asset keys and sizes before fetching stored images.
      { pathname: "/api/catalog/media/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.hideacontent.com",
        pathname: "/public/products/**",
      },
    ],
  },
};

export default nextConfig;
