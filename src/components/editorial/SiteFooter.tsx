import Link from "next/link";
import { BRAND_NAME, BRAND_MESSAGE, CONTACT_EMAIL, INSTAGRAM_URL } from "@/content/site";

interface Props {
  admin?: boolean;
}

const EXPLORE = [
  { label: "Curation", href: "/curation" },
  { label: "People", href: "/people" },
  { label: "Space", href: "/space" },
  { label: "About", href: "/about" },
];

/**
 * 에디토리얼 페이지 공용 푸터(서버 컴포넌트) — 각 페이지가 직접 렌더한다.
 * QR 이야기·방명록 등 공간 경험 화면에는 기존 정책대로 푸터를 두지 않는다.
 * 개인정보처리방침·이용약관 페이지는 아직 없어 링크를 두지 않는다(준비되면 여기에 추가).
 */
export default function SiteFooter({ admin }: Props) {
  return (
    <footer className="editorial-bleed" style={{ background: "#000", color: "#fff" }}>
      <div className="ed-container py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="text-lg font-bold tracking-[0.08em]">{BRAND_NAME}</p>
            <p className="text-sm" style={{ color: "#a8a8a8" }}>{BRAND_MESSAGE}</p>
          </div>
          <div className="space-y-3">
            <p className="ed-label" style={{ color: "#777" }}>Explore</p>
            <ul className="space-y-2">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:underline underline-offset-4">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="ed-label" style={{ color: "#777" }}>Contact</p>
            <ul className="space-y-2">
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline underline-offset-4">
                  Instagram
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm hover:underline underline-offset-4">{CONTACT_EMAIL}</a>
              </li>
              <li>
                <Link href="/#participate" className="text-sm hover:underline underline-offset-4">공간 제안・제보・협업</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-6 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: "1px solid #262626" }}>
          <p className="text-xs" style={{ color: "#777" }}>© {BRAND_NAME}. 현재 파일럿 운영 중입니다.</p>
          {admin && (
            <Link href="/admin" className="text-xs" style={{ color: "#555" }}>관리자</Link>
          )}
        </div>
      </div>
    </footer>
  );
}
