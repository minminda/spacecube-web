/** EXPERIMENTAL ONLY — 사진 업로드를 로컬 Python 추론 서비스(/preprocess)로 그대로 전달한다. */
import { NextRequest, NextResponse } from "next/server";
import { requireHandwritingAdmin } from "@/lib/handwriting/requireAdmin";
import { HANDWRITING_SERVICE_URL } from "@/lib/handwriting/features";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireHandwritingAdmin();
  if (denied) return denied;

  const formData = await req.formData();

  try {
    const upstream = await fetch(`${HANDWRITING_SERVICE_URL}/preprocess`, {
      method: "POST",
      body: formData,
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "로컬 추론 서비스에 연결할 수 없습니다. handwriting-service가 실행 중인지 확인해주세요." },
      { status: 503 },
    );
  }
}
