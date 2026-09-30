import { NextResponse } from "next/server";
import { getEditorialViewer } from "@/lib/editorial";

export const dynamic = "force-dynamic";

// 상단 내비게이션(클라이언트)이 계정 영역·에디토리얼 미리보기 여부를 알기 위한 읽기 전용 조회.
// layout에서 auth()를 부르면 QR 진입(/c/[code]) 등 모든 페이지 렌더에 세션 조회가 더해지므로,
// 내비게이션만 화면이 뜬 뒤 이 라우트로 늦게 가져온다.
export async function GET() {
  const viewer = await getEditorialViewer();
  return NextResponse.json(viewer, { headers: { "Cache-Control": "private, no-store" } });
}
