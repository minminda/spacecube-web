/* EXPERIMENTAL ONLY — 손글씨→디지털 필체 변환 PoC. 기존 관리자 권한 검증(isAdmin)을 그대로
   쓰고, ENABLE_HANDWRITING_POC 플래그가 꺼져 있으면 일반 사용자와 동일하게 404 처리한다.
   방명록/Record/추천/QR/로그인 등 실제 파일럿 로직은 이 화면에서 전혀 참조하지 않는다. */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_HANDWRITING_POC } from "@/lib/handwriting/features";
import HandwritingWizard from "@/components/admin/handwriting/HandwritingWizard";

export const metadata = { title: "손글씨 실험 — 공간큐브 관리자" };

export default async function HandwritingTestPage() {
  if (!ENABLE_HANDWRITING_POC) notFound();

  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / 손글씨 실험</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="p-4 border space-y-2" style={{ borderColor: "#c0392b" }}>
        <p className="text-sm font-semibold" style={{ color: "#c0392b" }}>EXPERIMENTAL — 개발/실험용</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          정해진 글자를 직접 작성한 뒤 촬영하면, 필체를 기반으로 다른 문장을 생성하는 실험 기능입니다.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          현재 테스트용이며 실제 방명록에는 적용되지 않습니다. 생성 결과는 어디에도 저장되지 않습니다.
        </p>
      </div>

      <HandwritingWizard />
    </main>
  );
}
