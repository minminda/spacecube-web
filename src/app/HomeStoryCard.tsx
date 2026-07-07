import Link from "next/link";
import Image from "next/image";

interface Props {
  href: string;
  typeLabel: string;
  meta?: string;
  title: string;
  intro: string;
  imageUrl?: string;
  spaces: { name: string; slug: string }[];
}

export default function HomeStoryCard({ href, typeLabel, meta, title, intro, imageUrl, spaces }: Props) {
  const excerpt = intro.length > 80 ? intro.slice(0, 80).trimEnd() + "…" : intro;

  return (
    <Link href={href} className="block group space-y-3">
      {imageUrl ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }}>
          <Image src={imageUrl} alt={title} fill className="object-cover group-hover:opacity-90 transition-opacity" style={{ aspectRatio: "unset" }} />
        </div>
      ) : (
        <div className="w-full" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }} />
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>{typeLabel}</span>
        {meta && <span className="text-xs" style={{ color: "var(--dim)" }}>{meta}</span>}
      </div>
      <p className="text-base font-semibold leading-snug group-hover:underline">{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{excerpt}</p>
      {spaces.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {spaces.map((space) => (
            <span key={space.slug} className="text-xs" style={{ color: "var(--dim)" }}>{space.name}</span>
          ))}
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--dim)" }}>읽기 →</p>
    </Link>
  );
}
