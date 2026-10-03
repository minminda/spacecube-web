import Link from "next/link";
import { BRAND_NAME, BRAND_MESSAGE, CONTACT_EMAIL, INSTAGRAM_URL } from "@/content/site";

interface Props {
  admin?: boolean;
}

// 하단 보조 내비게이션 — 두 레이어를 나눠 보여준다.
// 공간큐브(SpaceCube Original): 공간큐브가 직접 만드는 영역의 허브(/spacecube)와 그 하위.
const ORIGINAL = [
  { label: "공간큐브", href: "/spacecube" },
  { label: "스토리", href: "/story" },
  { label: "큐레이션", href: "/curation" },
  { label: "함께한 공간", href: "/cube-spaces" },
  { label: "공간큐브 소개", href: "/about" },
];
// 플랫폼: 내 취향으로 공간을 찾는 기능(공개된 것만 — 공간 찾기·큐레이터는 아직 미리보기라 넣지 않는다).
const PLATFORM = [
  { label: "추천", href: "/recommend" },
  { label: "내 아카이브", href: "/archive" },
];

/**
 * 에디토리얼 페이지 공용 푸터(서버 컴포넌트) — 각 페이지가 직접 렌더한다.
 * QR 이야기·방명록 등 공간 경험 화면에는 기존 정책대로 푸터를 두지 않는다.
 * 개인정보처리방침·이용약관 페이지는 아직 없어 링크를 두지 않는다(준비되면 여기에 추가).
 */
export default function SiteFooter({ admin }: Props) {
  return (
    <footer className="editorial-bleed" style={{ background: "#000", color: "#fff" }}>
      <div className="ed-container py-8 md:py-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="space-y-1.5">
            <p className="text-base font-bold tracking-[0.08em]">{BRAND_NAME}</p>
            <p className="text-xs" style={{ color: "#a8a8a8" }}>{BRAND_MESSAGE}</p>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-5 text-sm">
            <nav aria-label="공간큐브">
              <p className="pb-2 text-[11px] tracking-[0.12em] uppercase" style={{ color: "#777" }}>SpaceCube Original</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {ORIGINAL.map((l) => (
                  <li key={l.href}><Link href={l.href} className="hover:underline underline-offset-4">{l.label}</Link></li>
                ))}
                <li>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">Instagram</a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline underline-offset-4">Contact</a>
                </li>
              </ul>
            </nav>
            <nav aria-label="플랫폼">
              <p className="pb-2 text-[11px] tracking-[0.12em] uppercase" style={{ color: "#777" }}>Platform</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {PLATFORM.map((l) => (
                  <li key={l.href}><Link href={l.href} className="hover:underline underline-offset-4">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: "1px solid #262626" }}>
          <p className="text-xs" style={{ color: "#777" }}>© {BRAND_NAME}. 현재 파일럿 운영 중입니다.</p>
          {admin && (
            <Link href="/admin" className="text-xs" style={{ color: "#555" }}>관리자</Link>
          )}
        </div>
      </div>
    </footer>
  );
}
