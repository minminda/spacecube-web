import { redirect } from "next/navigation";

/**
 * 공개 SPACE 전체 목록은 정보 구조 개편(2026-10)으로 두 갈래가 됐다 — 일반 공간 발견은 지역 기반
 * CURATION(/curation), 실제 Cube 파트너 공간은 함께한 공간(/cube-spaces). 기존 /spaces 링크는
 * 지역부터 고르는 CURATION으로 보낸다. 공간 상세(/spaces/[slug])는 그대로.
 */
export default function SpaceListPage() {
  redirect("/curation");
}
