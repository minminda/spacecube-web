"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import EntryLoadingScreen from "@/components/EntryLoadingScreen";

/**
 * `/c/[code]`가 큐브를 조회해 "redirect"(정상 진입) 상태로 판정한 뒤 렌더하는 클라이언트
 * 다리(bridge) — 기존에는 여기서 서버 `redirect()`로 `/api/cube-entry/[code]`를 호출해
 * 문서를 통째로 새로 열었다(각 홉마다 브라우저가 다음 응답을 받을 때까지 아무것도 보여줄
 * 게 없어 흰 화면 위험이 있었다). 대신 이 화면(EntryLoadingScreen, 이미 즉시 보이고 있음)을
 * 화면에 계속 띄운 채로 client-side fetch + router.replace로 이어서, 실제 목적지(Episode
 * 페이지)까지 문서 전환(하드 리로드) 없이 매끄럽게 넘어간다 — 그 사이 흰 화면이 끼어들
 * 여지가 없다. 이 화면은 일부러 Cube Unlock 큐브 비주얼을 보여주지 않는다 — 목적지 페이지의
 * SpaceUnlockScreen이 곧이어 같은 큐브 애니메이션을 다시 재생해 "두 번 등장"하는 것처럼
 * 보였기 때문에, 텍스트("Loading...")만 담은 최소 화면으로 대기 상태만 알려준다.
 *
 * `/api/cube-entry/[code]`가 하는 일(SpaceScan 기록, QR 접근 쿠키 발급, 로그인 시 SpaceUnlock
 * 즉시 부여)은 그대로 그 라우트 안에서 정확히 한 번만 실행된다 — 여기서는 그 결과 URL로
 * 클라이언트 내비게이션만 담당할 뿐, 어떤 분석 이벤트도 새로 기록하지 않는다.
 */
export default function CubeUnlockBridge({ code }: { code: string }) {
  const router = useRouter();
  // React 개발 모드 StrictMode의 mount→cleanup→remount 이중 실행에도 fetch(=SpaceScan 기록)가
  // 두 번 나가지 않도록 막는다 — 컴포넌트 인스턴스가 살아있는 동안 ref는 유지된다.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    fetch(`/api/cube-entry/${encodeURIComponent(code)}`, { redirect: "follow" })
      .then((res) => {
        const dest = new URL(res.url);
        const destCodeSegment = dest.pathname.split("/").filter(Boolean).pop() ?? "";
        const isSelfRedirect = dest.pathname.startsWith("/c/") && destCodeSegment.toUpperCase() === code.toUpperCase();
        if (isSelfRedirect) {
          // 그 사이 큐브 상태가 바뀌었거나(비활성화 등) 잘못된 코드로 판명된 경우 — 서버가
          // not_found/disabled/unassigned 화면을 다시 그리도록 새로고침한다(기존 /c/[code]
          // page.tsx의 해당 분기를 그대로 재사용, 별도 화면을 새로 만들지 않는다).
          window.location.reload();
          return;
        }
        router.replace(dest.pathname + dest.search);
      })
      .catch(() => {
        // fetch 자체가 실패하면(네트워크 등) 하드 내비게이션으로 폴백 — 사용자가 멈춰있지 않게.
        window.location.href = `/api/cube-entry/${encodeURIComponent(code)}`;
      });
  }, [code, router]);

  return <EntryLoadingScreen />;
}
