import type { AnchorHTMLAttributes } from "react";

/* 문서 전체를 새로 불러오는 이동(클라이언트 라우팅 아님) — 일반 <a>.
   방명록 캔버스는 html/body를 overflow:hidden으로 잠그는 "고정 화면"이다. 이 화면에 소프트 내비게이션(next/link)으로 들어오고 나가면
   같은 문서에서 스크롤 잠금이 켜졌다 꺼지는데, iOS Safari는 그 뒤에도 주소창 접기 상태를 다시 계산하지 않아 주소창이 계속 펼쳐져 있는 일이 있다.
   잠금 화면의 앞뒤 이동만 새 문서로 불러오면 HOME 등은 직접 접속했을 때와 같은 상태로 시작한다. */
export default function HardLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
