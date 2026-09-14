import { NextRequest } from "next/server";
import { assertSalesAccess } from "@/lib/sales/access";
import { salesStatement } from "@/lib/sales/statement";
export async function GET(request: NextRequest) {
  const { agent } = await assertSalesAccess();
  return salesStatement(
    agent,
    request.nextUrl.searchParams.get("mes") ||
      new Date().toISOString().slice(0, 7),
  );
}
