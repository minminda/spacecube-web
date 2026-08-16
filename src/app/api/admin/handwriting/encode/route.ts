/** EXPERIMENTAL ONLY — 승인된 셀 이미지를 Python 추론 서비스(/encode)로 전달한다. */
import { NextRequest, NextResponse } from "next/server";
import { requireHandwritingAdmin } from "@/lib/handwriting/requireAdmin";
import { callHandwritingService } from "@/lib/handwriting/callInferenceService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireHandwritingAdmin(req);
  if (denied) return denied;

  const body = await req.json();

  try {
    const upstream = await callHandwritingService("/encode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    // FastAPI의 HTTPException은 {"detail": "..."}로 내려온다 — 프론트가 기대하는
    // {"error": "..."} 형태로 맞춰줘야 구체적인 실패 사유가 그대로 보인다.
    if (!upstream.ok && typeof data.error === "undefined" && typeof data.detail === "string") {
      data.error = data.detail;
    }
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "손글씨 서버를 준비하고 있습니다. 처음 실행할 때는 조금 더 걸릴 수 있어요 — 잠시 후 다시 시도해주세요." },
      { status: 503 },
    );
  }
}
