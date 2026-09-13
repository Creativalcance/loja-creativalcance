import { NextRequest, NextResponse } from "next/server";
import { claimGuestShopping } from "@/lib/cart/claim-guest";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function GET(request: NextRequest) {
  // Shared by already-authenticated login visits; no cache may retain identity.
  await claimGuestShopping();
  const destination = safeReturnPath(request.nextUrl.searchParams.get("next")) ?? "/";
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
