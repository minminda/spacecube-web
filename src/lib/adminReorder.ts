/** 정렬된 id 배열에서 하나를 한 칸 위/아래로 옮긴 새 배열을 반환한다. */
export function moveInOrder(ids: string[], id: string, direction: "up" | "down"): string[] {
  const i = ids.indexOf(id);
  if (i === -1) return ids;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
