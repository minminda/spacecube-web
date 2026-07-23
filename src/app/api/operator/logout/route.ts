import { NextResponse } from "next/server";
import { clearOperatorSessionCookie } from "@/lib/operatorSession";

export async function POST() {
  await clearOperatorSessionCookie();
  return NextResponse.json({ ok: true });
}
