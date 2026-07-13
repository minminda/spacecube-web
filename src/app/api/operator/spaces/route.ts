import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveOperatorSpaces } from "@/lib/operatorAuth";
import { computeReportPeriod } from "@/lib/reportPeriod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const spaces = await resolveOperatorSpaces(user.id, user.email);

  const result = spaces.map((space) => {
    let period: { currentPeriodStart: string; currentPeriodEnd: string; nextReportDate: string } | null = null;
    if (space.reportEnabled && space.reportStartDate && space.reportStartDate.getTime() <= Date.now()) {
      const p = computeReportPeriod(space.reportStartDate);
      period = {
        currentPeriodStart: p.currentPeriodStart.toISOString(),
        currentPeriodEnd: p.currentPeriodEnd.toISOString(),
        nextReportDate: p.nextReportDate.toISOString(),
      };
    }
    return {
      id: space.id,
      name: space.name,
      slug: space.slug,
      reportEnabled: space.reportEnabled,
      reportStartDate: space.reportStartDate?.toISOString() ?? null,
      period,
    };
  });

  return NextResponse.json({ spaces: result });
}
