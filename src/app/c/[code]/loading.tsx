import EntryLoadingScreen from "@/components/EntryLoadingScreen";

/**
 * `/c/[code]`는 실제 QR 스티커를 스캔했을 때만 도달하는 경로다(앱 내부 어디서도 이 경로로
 * 링크를 걸지 않는다) — 그래서 이 loading.tsx가 다른 화면의 내비게이션에 영향을 줄 걱정
 * 없이, 이 경로 전용으로 안전하게 추가할 수 있다. page.tsx가 큐브 상태를 조회하는 동안
 * (DB 왕복) 브라우저가 흰 화면을 먼저 보여주지 않도록 즉시 같은 화면을 그린다. Cube Unlock
 * 큐브 비주얼은 여기서 보여주지 않는다 — 목적지 Episode 페이지의 SpaceUnlockScreen과
 * 중복 재생되는 것처럼 보였기 때문에, 이 단계는 의도적으로 "Loading..." 텍스트만 담는다.
 */
export default function Loading() {
  return <EntryLoadingScreen />;
}
