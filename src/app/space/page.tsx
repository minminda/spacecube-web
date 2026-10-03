import { redirect } from "next/navigation";

// 공개 SPACE 목록은 /spaces로 분리했다 — /space/[slug]/** 는 Cube 운영(QR → 이야기 → 방명록)
// 전용 라우트라 공개 콘텐츠와 경로를 섞지 않는다. /space로 들어온 요청만 목록으로 보낸다.
export default function SpaceIndexRedirect() {
  redirect("/curation");
}
