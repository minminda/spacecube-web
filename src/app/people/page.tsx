import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listPeople } from "@/lib/editorial/queries";
import { formatPeopleNumber } from "@/lib/editorial/types";

export const metadata: Metadata = {
  title: "PEOPLE — 공간큐브",
  description: "한 사람이 머문 공간을 따라가며, 그 사람을 조금 더 이해하는 이야기.",
};

/** PEOPLE 목록 — Editorial CMS에서 발행된 PEOPLE만. */
export default async function PeopleListPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/");

  const people = await listPeople();

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          label="People"
          title="PEOPLE"
          description="공간을 통해 한 사람을 알아갑니다. 카페, 집, 골목, 학교, 작업실 — 한 사람에게 의미 있는 장소가 그 사람을 설명합니다."
        />
        <section className="ed-container pt-12 md:pt-16">
          {people.length === 0 ? (
            <p className="text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 PEOPLE 이야기를 준비하고 있습니다.</p>
          ) : (
            <div className="grid gap-14 md:grid-cols-12 md:gap-x-12 md:gap-y-20">
              {people.map((p, i) => (
                <Link key={p.id} href={`/people/${p.slug}`} className={`group block ${i === 0 ? "md:col-span-8" : "md:col-span-4"}`}>
                  <EdImage image={p.cover} ratio={i === 0 ? "3 / 2" : "4 / 5"} sizes="(min-width: 768px) 66vw, 100vw" priority={i === 0} />
                  <div className="pt-5 space-y-2">
                    <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
                      {formatPeopleNumber(p.number)}{p.subject ? ` · ${p.subject}` : ""}
                    </p>
                    <p className="text-2xl md:text-[28px] font-bold leading-snug tracking-tight group-hover:underline underline-offset-4">{p.title}</p>
                    <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{p.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
