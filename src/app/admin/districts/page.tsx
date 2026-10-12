import { redirect } from "next/navigation";

/** 지역 관리는 공간 지도(/admin/spaces/map)로 통합됐다 — 기존 링크 호환용 리다이렉트. */
export default function DistrictsAdminPage() {
  redirect("/admin/spaces/map?panel=regions");
}
