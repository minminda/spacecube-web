import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { generateCubes } from "@/lib/cubeCode";

export const dynamic = "force-dynamic";

const MAX_QUANTITY = 100;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { quantity?: number };
  const quantity = Number(body.quantity);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: `생성 수량은 1~${MAX_QUANTITY} 사이여야 해요.` }, { status: 400 });
  }

  const cubes = await generateCubes(quantity);
  return NextResponse.json({ cubes }, { status: 201 });
}
