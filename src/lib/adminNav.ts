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

/**
 * 뒤로가기의 "상위 화면" — 이전 화면 기록이 없을 때(주소로 바로 들어온 경우) 갈 곳. /admin 자체는 null(뒤로가기 없음).
 * STORY · CURATION 편집/새 글 → 콘텐츠 백로그, 공간 콘텐츠 편집 → 공간 콘텐츠 목록, 운영 공간의 하위 화면 → 운영 공간 목록,
 * 에피소드 편집 → 그 공간의 에피소드 목록, 그 밖의 한 단계 화면 → 대시보드.
 */
export function adminBackFallback(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/admin" || !p.startsWith("/admin/")) return null;
  const seg = p.split("/").slice(2); // "/admin/a/b" → ["a", "b"]

  if (seg[0] === "content") {
    if (seg.length === 1) return "/admin";
    if (seg[1] === "spaces") return seg.length > 2 ? "/admin/content/spaces" : "/admin/content";
    return "/admin/content"; // people · thoughts · curations(목록·새 글·편집) · home · media
  }
  if (seg[0] === "stories") return seg.length > 1 ? "/admin/stories" : "/admin";
  if (seg[0] === "cubes") return seg.length > 1 ? "/admin/cubes" : "/admin";
  if (seg[0] === "new") return "/admin/spaces";
  if (seg.length === 1) return "/admin";
  // 나머지 2단계 이상은 /admin/[운영 공간 id]/… 화면
  const base = `/admin/${seg[0]}`;
  if (seg[1] === "episodes" && seg.length > 2) return `${base}/episodes`;
  if (seg[1] === "report" && seg.length > 2) return `${base}/report`;
  return "/admin/spaces";
}
