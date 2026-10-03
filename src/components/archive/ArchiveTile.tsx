import Link from "next/link";
import EdImage from "@/components/editorial/EdImage";
import PartnerMark from "@/components/editorial/PartnerMark";

export interface ArchiveTileData {
  key: string;
  href: string;
  name: string;
  imageUrl: string | null;
  /** 지역 · 유형 */
  meta: string;
  /** 방문 횟수·마지막 방문, 저장일 등 한 줄 */
  note?: string;
  partner?: boolean;
}

/** 아카이브 공간 타일 — 사진 · 이름 · 작은 메타. 박스·그림자 없이 사진과 타이포그래피만. */
export default function ArchiveTile({ t }: { t: ArchiveTileData }) {
  return (
    <Link href={t.href} className="group block">
      <EdImage image={{ src: t.imageUrl, alt: t.name }} ratio="4 / 5" sizes="(min-width: 768px) 25vw, 50vw" />
      <div className="pt-3 space-y-1">
        <p className="flex items-baseline gap-2 text-[15px] font-semibold leading-snug">
          <span className="group-hover:underline underline-offset-4">{t.name}</span>
          {t.partner && <PartnerMark size={13} />}
        </p>
        {t.meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{t.meta}</p>}
        {t.note && <p className="text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>{t.note}</p>}
      </div>
    </Link>
  );
}
