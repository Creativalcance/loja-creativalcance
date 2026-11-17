"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { revokeMetaPixelConsent, updateMetaPixel } from "@/lib/analytics/meta-pixel";

export default function MetaPixelTag({ consentGranted }: { consentGranted: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    updateMetaPixel(consentGranted, pathname);
  }, [consentGranted, pathname]);

  useEffect(() => () => revokeMetaPixelConsent(), []);

  // No unconditional noscript beacon: it would bypass cookie consent.
  return null;
}
