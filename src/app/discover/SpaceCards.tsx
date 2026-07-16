import SpaceDiscoveryCard, { type SpaceDiscoverySpace } from "./SpaceDiscoveryCard";

interface Props {
  spaces: SpaceDiscoverySpace[];
  /** 지금 이 순간 유효한(마지막 스캔으로부터 12시간 이내) SpaceUnlock이 있는 공간 ID 목록 —
      취향 점수(Record)가 아니라 오직 QR 스캔 기준이다. 12시간이 지나면 다시 빠진다. */
  unlockedSpaceIds?: string[];
}

/** 전체 공간 목록 그리드 — 카드 표시/잠금 다이얼로그 자체는 SpaceDiscoveryCard(공용)가 담당. */
export default function SpaceCards({ spaces, unlockedSpaceIds = [] }: Props) {
  const unlockedSet = new Set(unlockedSpaceIds);

  if (spaces.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 pb-8">
      {spaces.map((space) => (
        <SpaceDiscoveryCard key={space.id} space={space} isUnlocked={unlockedSet.has(space.id)} variant="default" />
      ))}
    </div>
  );
}
