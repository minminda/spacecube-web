import Link from "next/link";

interface Props {
  /** 위치 확인 링크(네이버 지도 등) — 없으면 버튼 자체를 숨긴다 */
  naverMapUrl?: string | null;
  /** "탐험으로 돌아가기" 등 보조 링크 — 없으면 표시하지 않는다 */
  backHref?: string;
  backLabel?: string;
  /** 이번 방문이 실제 Cube QR 경유(?src=qr)인지 — 로그인 CTA를 보여줄지 판단하는 데만 쓴다 */
  fromQr?: boolean;
  /** 로그인 상태 — fromQr && !isLoggedIn일 때만 로그인 버튼을 보여준다 */
  isLoggedIn?: boolean;
  /** 로그인 버튼의 목적지(로그인 후 이 공간으로 되돌아오는 callbackUrl 포함) */
  loginHref?: string;
}

/**
 * 공간의 이야기(Episode/방명록/기록)는 취향 점수가 아니라 실제 Cube QR 스캔으로만 열린다는
 * 원칙을 보호 페이지마다 동일한 문구로 안내한다. "잠금 해제하기" 같은 온라인 우회 버튼은
 * 의도적으로 두지 않는다 — 유일한 CTA는 위치 확인뿐이다.
 *
 * 예외: fromQr && !isLoggedIn(실제로 큐브 QR을 스캔했지만 그 스캔이 비로그인 상태였던 경우)만
 * 로그인 버튼을 보여준다. 해제는 여전히 서명된 pending-unlock 쿠키(src/lib/spaceUnlock.ts)로만
 * 이뤄지므로 이 버튼 자체가 잠금을 풀어주지 않는다 — 이미 시작된 정당한 흐름을 로그인까지
 * 이어주는 것뿐이라 "온라인 우회"에 해당하지 않는다.
 */
export default function SpaceLockNotice({ naverMapUrl, backHref, backLabel = "탐험으로 돌아가기", fromQr, isLoggedIn, loginHref }: Props) {
  const needsLogin = fromQr && !isLoggedIn && loginHref;
  // 로그인은 돼 있는데 스캔 경유로 왔는데도 여전히 잠긴 경우 — pending-unlock 쿠키가 만료(30분)됐거나
  // 다른 큐브의 스캔이었을 가능성이 높다. 로그인 버튼 대신 재스캔을 안내한다.
  const scanExpired = fromQr && isLoggedIn;

  return (
    <div className="space-y-4 p-6 border text-center" style={{ borderColor: "var(--border)" }}>
      {needsLogin ? (
        <>
          <p className="text-base font-medium leading-relaxed whitespace-pre-line">
            {"큐브 QR 인식을 확인했습니다.\n로그인하면 바로 열립니다."}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            공간의 이야기는 로그인한 내 계정에 저장돼요.
          </p>
        </>
      ) : scanExpired ? (
        <>
          <p className="text-base font-medium leading-relaxed whitespace-pre-line">
            {"방금 스캔한 기록을 찾을 수 없습니다."}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            큐브의 QR을 다시 스캔해주세요.
          </p>
        </>
      ) : (
        <>
          <p className="text-base font-medium leading-relaxed whitespace-pre-line">
            {"이 공간의 이야기는\n공간에서 열립니다."}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
            {"공간에 놓인 큐브의 QR을 스캔하면\n이야기와 방명록의 잠금이 해제됩니다."}
          </p>
        </>
      )}
      <div className="flex flex-col gap-2 pt-1">
        {needsLogin && (
          <Link href={loginHref} className="w-full text-center text-sm py-3 border" style={{ borderColor: "var(--fg)" }}>
            로그인하고 이야기 열기
          </Link>
        )}
        {naverMapUrl && (
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center text-sm py-3 border"
            style={{ borderColor: needsLogin ? "var(--border)" : "var(--fg)", color: needsLogin ? "var(--dim)" : undefined }}
          >
            위치 확인하기
          </a>
        )}
        {backHref && (
          <Link href={backHref} className="w-full text-center text-sm py-3 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
