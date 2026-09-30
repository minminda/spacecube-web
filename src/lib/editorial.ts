/* ── 에디토리얼 홈 서버 헬퍼 ─────────────────────────────────────────────
   - 공개 여부 판정(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기)
   - 기존 Space 데이터 조회(읽기 전용) — 새 모델 없이 slug로만 참조한다. ── */

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import type { ImageRef } from "@/content/types";

export interface EditorialViewer {
  loggedIn: boolean;
  admin: boolean;
  /** 새 정보구조(홈/CURATION/PEOPLE/SPACE 목록)를 볼 수 있는지 */
  editorial: boolean;
}

export async function getEditorialViewer(): Promise<EditorialViewer> {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  return { loggedIn: !!session?.user, admin, editorial: ENABLE_EDITORIAL_HOME || admin };
}

export interface EditorialSpace {
  slug: string;
  name: string;
  district: string | null;
  typeLabel: string;
  tagline: string | null;
  imageUrl: string | null;
  imagePositionX: number;
  imagePositionY: number;
  hasCube: boolean;
}

/** slug 목록 순서대로 활성 공간을 조회한다. 비활성·없는 slug는 조용히 건너뛴다. */
export async function getSpacesBySlugs(slugs: string[]): Promise<EditorialSpace[]> {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return [];
  const rows = await prisma.space.findMany({
    where: { slug: { in: unique }, isActive: true },
    select: {
      slug: true, name: true, district: true, type: true, tagline: true,
      imageUrl: true, imagePositionX: true, imagePositionY: true,
      cube: { select: { status: true } },
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
    },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return unique.flatMap((slug) => {
    const r = bySlug.get(slug);
    if (!r) return [];
    return [{
      slug: r.slug,
      name: r.name,
      district: r.district,
      typeLabel: resolveSpaceTypeLabel(r.spaceTagLinks, r.type),
      tagline: r.tagline,
      imageUrl: r.imageUrl,
      imagePositionX: r.imagePositionX ?? 0.5,
      imagePositionY: r.imagePositionY ?? 0.5,
      hasCube: r.cube?.status === "ASSIGNED",
    }];
  });
}

export interface ResolvedImage {
  src: string | null;
  alt: string;
  caption?: string;
  position?: string;
}

/** ImageRef → 실제 이미지 URL(없으면 src:null → 플레이스홀더로 렌더). */
export function resolveImage(ref: ImageRef | undefined, spaces: Map<string, EditorialSpace>): ResolvedImage {
  if (!ref) return { src: null, alt: "" };
  if (ref.src) return { src: ref.src, alt: ref.alt, caption: ref.caption };
  const space = ref.spaceSlug ? spaces.get(ref.spaceSlug) : undefined;
  return {
    src: space?.imageUrl ?? null,
    alt: ref.alt,
    caption: ref.caption,
    position: space ? `${space.imagePositionX * 100}% ${space.imagePositionY * 100}%` : undefined,
  };
}

export function toSpaceMap(spaces: EditorialSpace[]): Map<string, EditorialSpace> {
  return new Map(spaces.map((s) => [s.slug, s]));
}
