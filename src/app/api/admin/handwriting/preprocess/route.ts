/** EXPERIMENTAL ONLY — 사진 업로드를 Python 추론 서비스(/preprocess)로 그대로 전달한다. */
import { NextRequest, NextResponse } from "next/server";
import { requireHandwritingAdmin } from "@/lib/handwriting/requireAdmin";
import { callHandwritingService } from "@/lib/handwriting/callInferenceService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireHandwritingAdmin();
  if (denied) return denied;

  const formData = await req.formData();

  try {
    const upstream = await callHandwritingService("/preprocess", { method: "POST", body: formData });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "손글씨 서버를 준비하고 있습니다. 처음 실행할 때는 조금 더 걸릴 수 있어요 — 잠시 후 다시 시도해주세요." },
      { status: 503 },
    );
  }
}
