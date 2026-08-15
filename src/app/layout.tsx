import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "360 Merchandising | Brindes Promocionais Personalizados",
    template: "%s | 360 Merchandising",
  },
  description:
    "Plataforma B2B premium para brindes promocionais, merchandising corporativo, vestuário promocional e gifts empresariais personalizados.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
