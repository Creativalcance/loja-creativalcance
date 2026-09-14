import { NextRequest } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { payoutDocument } from "@/lib/sales/documents";
export async function GET(request: NextRequest) {
  await assertAdminAccess("/admin/rede-comercial");
  return payoutDocument(request.nextUrl.searchParams.get("pagamento") || "");
}
