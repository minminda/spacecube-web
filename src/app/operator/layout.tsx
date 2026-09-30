import { getOperatorSession } from "@/lib/operatorSession";
import OperatorHeader from "./OperatorHeader";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getOperatorSession();

  // 관리자와 같은 디자인 시스템(.admin-ui)을 쓰되 사이드바 없이 — 운영자는 자기 운영 공간 하나만 관리한다.
  // 인증(PIN 세션)·데이터 범위는 각 페이지의 기존 검증(resolveOperatorSpaceOrRedirect) 그대로다.
  return (
    <div className="admin-ui admin-bleed">
      <OperatorHeader hasSession={!!session} />
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
    </div>
  );
}
