import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import SpaceCard from "@/components/editorial/SpaceCard";
import PartnerMark from "@/components/editorial/PartnerMark";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listCubeSpaces } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";

export const metadata: Metadata = {
  title: "함께한 공간 — 공간큐브",
  description: "공간큐브와 실제로 함께한 공간. 웹에서는 운영자의 이야기를, 현장에서는 Cube로 그곳에서만 의미 있는 이야기를 만납니다.",
};

/** 채널별 역할 — 웹은 전체 맥락, 현장 Cube는 그 자리에서만 의미 있는 디테일, 방명록은 방문자의 흔적. */
const ROLES = [
  { en: "WEB", title: "운영자의 이야기", body: "공간을 시작한 이유, 선택과 고민, 기억까지 — 전체 이야기를 여기서 읽을 수 있어요." },
  { en: "CUBE", title: "현장에서만 만나는 1~2분", body: "웹 이야기의 잠긴 뒷부분이 아니에요. 그 자리에 있어야 보이는 디테일을 공간 안의 Cube가 들려줍니다." },
  { en: "GUESTBOOK", title: "다녀간 사람들의 흔적", body: "Cube 이야기 끝에서 방명록으로 이어져, 같은 공간을 지나간 사람들의 문장을 만나요." },
];

/**
 * 함께한 공간(CUBE SPACES) — 실제 GONGGANCUBE가 설치됐거나 공식 협업한 공간(EditorialSpace.cubeAvailable)만.
 * 큐레이션의 일반 공간은 여기 넣지 않는다. 상세는 공개 SPACE 상세(/spaces/[slug])를 함께 쓴다.
 * 현장 Episode·방명록(/space/[slug]/**)으로는 링크하지 않는다 — Cube 이야기는 현장에서만 연다.
 */
export default async function CubeSpacesPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/");

  const [spaces, savedIds] = await Promise.all([listCubeSpaces(), getSavedEditorialSpaceIds(viewer.userId)]);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          title="함께한 공간"
          description="공간큐브와 실제로 함께한 공간입니다. 큐레이션에서 소개하는 공간과 달리, 이곳들에는 현장에 Cube가 있어요."
        />

        <section className="ed-container pt-10 md:pt-14 grid gap-6 md:grid-cols-3 md:gap-10">
          {ROLES.map((r) => (
            <div key={r.en} className="pt-4 space-y-2" style={{ borderTop: "1px solid var(--ed-fg)" }}>
              <p className="ed-label">{r.en}</p>
              <p className="text-base font-bold">{r.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>{r.body}</p>
            </div>
          ))}
        </section>

        <section className="ed-container pt-14 md:pt-20">
          <div className="flex items-center justify-between pb-6">
            <p className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--ed-dim)" }}>
              <PartnerMark size={14} /> 표시는 현장에 Cube가 있는 공간이라는 뜻이에요 — 평가나 등급이 아닙니다.
            </p>
            <p className="text-xs tabular-nums shrink-0" style={{ color: "var(--ed-dim)" }}>{spaces.length}곳</p>
          </div>
          {spaces.length === 0 ? (
            <p className="text-base py-8" style={{ color: "var(--ed-dim)" }}>함께한 공간을 준비하고 있어요.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
              {spaces.map((s, i) => (
                <div key={s.id} className={i % 3 === 1 ? "md:mt-16" : ""}>
                  <SpaceCard
                    space={s}
                    ratio={i % 2 === 0 ? "4 / 5" : "1 / 1"}
                    sizes="(min-width: 768px) 33vw, 50vw"
                    showSummary
                    save={{ saved: savedIds.has(s.id), loggedIn: viewer.loggedIn }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
