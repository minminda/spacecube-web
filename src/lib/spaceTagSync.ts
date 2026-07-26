/* ── 레거시 spaceTags(TagKey[]) → 신규 SpaceTag 동기화 ──────────────────────
   관리자가 공간을 만들거나 태그를 저장할 때마다 이 함수가 대응하는 SpaceTag 링크를
   함께 만든다. 예전에는 /owner/[id]/space-tags 화면에 별도로 들어가야만 신규
   시스템이 채워졌는데(감사에서 지적된 "두 체계가 어긋나는 근본 원인"), 이제는 레거시
   입력 하나로 두 체계가 함께 채워진다. 서버 전용 — Prisma에 의존하므로 클라이언트
   컴포넌트가 상수를 가져다 쓰는 src/lib/tags.ts와는 분리한다. ── */

import { prisma } from "@/lib/prisma";
import type { TagKey } from "@prisma/client";

/**
 * spaceTags(레거시 TagKey 배열)에 대응하는 SpaceTag 링크가 없으면 만든다.
 * 이미 있는 링크(관리자가 /owner/[id]/space-tags에서 가중치·노출 여부를 손봐둔 것)는
 * update:{}라 절대 덮어쓰지 않는다 — "누락분만 채우는" 순수 추가 동작.
 */
export async function syncLegacySpaceTagsToSpaceTag(spaceId: string, spaceTags: TagKey[]): Promise<void> {
  if (spaceTags.length === 0) return;

  const tags = await prisma.tag.findMany({ where: { legacyKey: { in: spaceTags } } });
  const tagIdByKey = new Map(tags.map((t) => [t.legacyKey as TagKey, t.id]));

  await Promise.all(
    spaceTags.map((key, i) => {
      const tagId = tagIdByKey.get(key);
      if (!tagId) return null;
      return prisma.spaceTag.upsert({
        where: { spaceId_tagId: { spaceId, tagId } },
        update: {},
        create: { spaceId, tagId, weight: 1, isPrimary: i === 0 },
      });
    }),
  );
}
