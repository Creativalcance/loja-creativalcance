import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

const PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/area-cliente",
  "/area-comercial",
  "/auth",
  "/carrinho",
  "/checkout",
  "/login",
  "/logout",
  "/nova-password",
  "/recuperar-password",
  "/registo",
  "/produto/*/personalizar",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
