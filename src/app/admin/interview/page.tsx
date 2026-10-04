import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import InterviewLibrary from "./InterviewLibrary";
import { AdminPageHeader } from "@/components/admin/ui";

export default async function InterviewLibraryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const episodeTemplates = await prisma.interviewEpisodeTemplate.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      sceneTopics: {
        orderBy: { displayOrder: "asc" },
        include: { questions: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="cube"
        breadcrumb={[{ label: "에피소드", href: "/admin/content-status" }]}
        title="인터뷰 질문 라이브러리"
        description=""
      />

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
      />
    </main>
  );
}
