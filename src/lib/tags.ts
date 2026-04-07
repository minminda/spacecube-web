import { Tag } from "@prisma/client";
import type { Lang } from "./i18n";

export const TAG_LABELS: Record<Tag, string> = {
  QUIET: "조용한",
  INSPIRING: "영감 있는",
  COMFORTABLE: "편안한",
  UNIQUE: "독특한",
  WANT_AGAIN: "다시 오고 싶은",
  SENSIBLE: "감각 있는",
  WARM: "따뜻한",
  FOCUSED: "집중되는",
};

export const TAG_LABELS_EN: Record<Tag, string> = {
  QUIET: "Quiet",
  INSPIRING: "Inspiring",
  COMFORTABLE: "Comfortable",
  UNIQUE: "Unique",
  WANT_AGAIN: "Want to Return",
  SENSIBLE: "Sensible",
  WARM: "Warm",
  FOCUSED: "Focused",
};

export const TAG_LABELS_JA: Record<Tag, string> = {
  QUIET: "静かな",
  INSPIRING: "インスピレーション",
  COMFORTABLE: "居心地の良い",
  UNIQUE: "ユニークな",
  WANT_AGAIN: "また来たい",
  SENSIBLE: "センスのある",
  WARM: "温かい",
  FOCUSED: "集中できる",
};

export function getTagLabels(lang: Lang): Record<Tag, string> {
  if (lang === "en") return TAG_LABELS_EN;
  if (lang === "ja") return TAG_LABELS_JA;
  return TAG_LABELS;
}

export const ALL_TAGS = Object.keys(TAG_LABELS) as Tag[];
