/* ── 관리자 정보구조(IA) ────────────────────────────────────────────────
   CONTENT(온라인 · 발견)와 CUBE OPERATION(현장 · 경험)을 명확히 나눈다.
   - CONTENT: 일반 홈페이지의 공개 Editorial Content(DB CMS). 콘텐츠 백로그(/admin/content)가 STORY·CURATION 제작의 입구.
   - CUBE OPERATION: 기존 Prisma Space("운영 공간")·Cube·Episode·방명록·KPI. 기존 URL 그대로.
   관리자 UI에서 DB Space는 "운영 공간", 홈페이지 SPACE는 "공간 콘텐츠"로 부른다.
   사이드바에 없는 기존 라우트(stories, handwriting-test, [id]/dashboard 등)도 삭제하지 않고 그대로 둔다. ── */

export type AdminArea = "overview" | "content" | "cube" | "system";

export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  /** 하위 도구(들여쓰기 표시) */
  sub?: boolean;
}

export interface AdminNavGroup {
  area: AdminArea;
  label: string;
  caption?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    area: "overview",
    label: "Overview",
    items: [{ key: "overview", label: "대시보드", href: "/admin" }],
  },
  {
    area: "content",
    label: "Content",
    caption: "온라인 · 발견",
    items: [
      { key: "content-backlog", label: "콘텐츠 백로그", href: "/admin/content" },
      { key: "content-curations", label: "CURATION", href: "/admin/content/curations", sub: true },
      { key: "content-people", label: "STORY · PEOPLE", href: "/admin/content/people", sub: true },
      { key: "content-thoughts", label: "STORY · THOUGHT", href: "/admin/content/thoughts", sub: true },
      { key: "content-spaces", label: "공간 콘텐츠", href: "/admin/content/spaces" },
      { key: "content-home", label: "홈페이지", href: "/admin/content/home" },
      { key: "curators", label: "큐레이터 (프로토타입)", href: "/admin/curators" },
      { key: "content-media", label: "미디어", href: "/admin/content/media" },
    ],
  },
  {
    area: "cube",
    label: "Cube Operation",
    caption: "현장 · 경험",
    items: [
      { key: "spaces", label: "운영 공간", href: "/admin/spaces" },
      { key: "cubes", label: "큐브", href: "/admin/cubes" },
      { key: "episodes", label: "에피소드", href: "/admin/content-status" },
      { key: "interview", label: "인터뷰 질문", href: "/admin/interview", sub: true },
      { key: "guestbook", label: "방명록", href: "/admin/guestbook" },
      { key: "reports", label: "KPI / 리포트", href: "/admin/reports" },
      { key: "materials", label: "운영 자료", href: "/admin/materials" },
    ],
  },
  {
    area: "system",
    label: "System",
    items: [
      { key: "tags", label: "태그 · 카테고리", href: "/admin/tags" },
      { key: "districts", label: "지역", href: "/admin/districts" },
      { key: "demo-data", label: "시연 데이터", href: "/admin/demo-data" },
    ],
  },
];

/** /admin 바로 아래의 고정 세그먼트 — 이 외의 세그먼트는 운영 공간 id(/admin/[id]/...)다. */
const STATIC_SEGMENTS = new Set([
  "spaces", "new", "content", "cubes", "content-status", "interview", "materials",
  "tags", "districts", "stories", "handwriting-test", "guestbook", "reports", "demo-data", "curators",
]);

/** 현재 경로에 해당하는 사이드바 항목 key. */
export function activeAdminNavKey(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean); // ["admin", ...]
  if (parts[0] !== "admin") return null;
  const seg = parts[1];
  if (!seg) return "overview";
  if (seg === "content") return parts[2] ? `content-${parts[2]}` : "content-backlog";
  if (seg === "new" || seg === "spaces") return "spaces";
  if (seg === "content-status") return "episodes";
  if (STATIC_SEGMENTS.has(seg)) return seg;
  // /admin/[id]/...
  const sub = parts[2];
  if (sub === "episodes") return "episodes";
  if (sub === "guestbook" || sub === "guestbook-sessions" || sub === "guestbook-settings") return "guestbook";
  if (sub === "report" || sub === "kpi" || sub === "report-settings") return "reports";
  return "spaces";
}

export function adminAreaOf(key: string | null): AdminArea | null {
  if (!key) return null;
  for (const g of ADMIN_NAV) if (g.items.some((i) => i.key === key)) return g.area;
  return null;
}
