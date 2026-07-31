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

  const topics = await prisma.interviewTopic.findMany({
    orderBy: { displayOrder: "asc" },
    include: { questions: { orderBy: { displayOrder: "asc" } } },
  });

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
          공간 운영자를 인터뷰할 때 쓰는 공용 질문 도구입니다. 특정 공간이나 에피소드에 속하지 않고,
          어떤 공간을 인터뷰하더라도 이 페이지 하나로 사용합니다.
        </p>
      </div>

      <InterviewLibrary
        initialTopics={topics.map((t) => ({
          id: t.id,
          title: t.title,
          questions: t.questions.map((q) => ({ id: q.id, content: q.content })),
        }))}
      />
    </main>
  );
}
