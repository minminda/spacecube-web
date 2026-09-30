import Link from "next/link";
import { STATUS_LABEL, type EditorialStatusValue } from "@/lib/editorial/types";

/**
 * 관리자 미리보기 띠 — 발행되지 않은 콘텐츠를 관리자가 공개 주소로 열었을 때만 보인다.
 * (일반 방문자에게는 초안/보관 콘텐츠 자체가 404라 이 띠가 렌더될 일이 없다.)
 */
export default function PreviewBanner({ status, editHref }: { status: EditorialStatusValue; editHref: string }) {
  if (status === "PUBLISHED") return null;
  return (
    <div className="sticky top-14 z-40 w-full" style={{ background: "#fff6e6", borderBottom: "1px solid #f0dcb0" }}>
      <div className="ed-container flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs" style={{ color: "#8a5a00" }}>
        <p>
          <strong className="font-semibold">미리보기 · {STATUS_LABEL[status]}</strong>
          <span className="ml-2">이 콘텐츠는 아직 공개되지 않았습니다. 관리자에게만 보입니다.</span>
        </p>
        <Link href={editHref} className="underline underline-offset-4">편집으로 돌아가기</Link>
      </div>
    </div>
  );
}
