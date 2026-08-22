// 공간 주소(Space.slug) 입력값 정규화/검증 — 영문 소문자, 숫자, 하이픈만 허용.
// /space/{slug} 라우팅과 관리자 생성/수정 폼(POST /api/spaces, PATCH /api/spaces/[id])에서 공용으로 쓴다.

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 소문자 변환 + 공백→하이픈 + 허용 문자 외 제거 + 연속 하이픈 정리 + 앞뒤 하이픈 제거.
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}
