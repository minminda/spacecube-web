import Link from "next/link";

interface Props {
  /** 위치 확인 링크(네이버 지도 등) — 없으면 버튼 자체를 숨긴다 */
  naverMapUrl?: string | null;
  /** "탐험으로 돌아가기" 등 보조 링크 — 없으면 표시하지 않는다 */
  backHref?: string;
  backLabel?: string;
}

/**
 * 공간의 이야기(Episode/방명록/기록)는 취향 점수가 아니라 실제 Cube QR 스캔으로만 열린다는
 * 원칙을 보호 페이지마다 동일한 문구로 안내한다. "잠금 해제하기" 같은 온라인 우회 버튼은
 * 의도적으로 두지 않는다 — 유일한 CTA는 위치 확인뿐이다.
 *
 * QR을 실제로 스캔했다면 로그인 여부와 무관하게 이미 열려 있으므로(src/lib/spaceUnlock.ts의
 * hasAnonymousSpaceAccess), 이 컴포넌트가 보인다는 것 자체가 "아직 이 공간의 QR을 스캔한 적이
 * 없다"는 뜻이다 — 그래서 로그인 유도 문구를 넣지 않는다.
 */
export default function SpaceLockNotice({ naverMapUrl, backHref, backLabel = "탐험으로 돌아가기" }: Props) {
  return (
    <div className="space-y-4 p-6 border text-center" style={{ borderColor: "var(--border)" }}>
      <p className="text-base font-medium leading-relaxed whitespace-pre-line">
        {"이 공간의 이야기는\n공간에서 열립니다"}
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
        {"공간에 놓인 큐브의 QR을 스캔하면\n이야기와 방명록의 잠금이 해제됩니다"}
      </p>
      <div className="flex flex-col gap-2 pt-1">
        {naverMapUrl && (
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target flex items-center justify-center w-full text-center text-sm py-3 border"
            style={{ borderColor: "var(--fg)" }}
          >
            위치 확인하기
          </a>
        )}
        {backHref && (
          <Link href={backHref} className="tap-target flex items-center justify-center w-full text-center text-sm py-3 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
