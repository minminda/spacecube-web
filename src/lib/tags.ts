import { Tag } from "@prisma/client";

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

export const ALL_TAGS = Object.keys(TAG_LABELS) as Tag[];
