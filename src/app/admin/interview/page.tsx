import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import InterviewLibrary from "./InterviewLibrary";

export default async function InterviewLibraryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [episodeTemplates, spaces] = await Promise.all([
    prisma.interviewEpisodeTemplate.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        sceneTopics: {
          orderBy: { displayOrder: "asc" },
          include: { questions: { orderBy: { displayOrder: "asc" } } },
        },
      },
    }),
    prisma.space.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / INTERVIEW</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>인터뷰 질문 관리</p>
        <h1 className="text-xl font-bold">공간큐브 인터뷰 질문 라이브러리</h1>
        <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--dim)" }}>
          에피소드별로 Scene 소재와 운영자 질문을 관리합니다. 질문은 운영자 답변을 얻기 위한 제작
          도구이며, 실제 Scene 제목은 답변을 바탕으로 별도로 작성합니다.
        </p>
      </div>

      <InterviewLibrary
        initialEpisodeTemplates={episodeTemplates.map((t) => ({
          id: t.id,
          episodeNumber: t.episodeNumber,
          title: t.title,
          description: t.description,
          isActive: t.isActive,
          sceneTopics: t.sceneTopics.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            isRequired: s.isRequired,
            questions: s.questions.map((q) => ({ id: q.id, content: q.content, isActive: q.isActive })),
          })),
        }))}
        spaces={spaces}
      />
    </main>
  );
}
