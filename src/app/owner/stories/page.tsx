import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function StoriesAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const stories = await prisma.contentStory.findMany({
    orderBy: { createdAt: "desc" },
    include: { storySpaces: true },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / STORIES</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <Link
        href="/owner/stories/new"
        className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        [[ + 새 스토리 작성 ]]
      </Link>

      {stories.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 작성된 스토리가 없어.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // 전체 스토리 {stories.length}개
          </p>
          {stories.map((story) => (
            <div
              key={story.id}
              className="p-4 border space-y-3"
              style={{ borderColor: "var(--border)", opacity: story.isActive ? 1 : 0.4 }}
            >
              <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                <div className="flex justify-between items-start">
                  <p style={{ color: "var(--fg)" }}>&gt; {story.title}</p>
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    <span className="border px-1.5 py-0.5" style={{ borderColor: "var(--border)" }}>
                      {story.type === "REGION" ? "지역" : "취향"}
                    </span>
                    {!story.isActive && <span>[비활성]</span>}
                    {!story.publishedAt && <span>[미발행]</span>}
                  </div>
                </div>
                {story.type === "REGION" && story.district && (
                  <p>district : {story.district}</p>
                )}
                {story.type === "TASTE" && story.persona && (
                  <p>persona  : {story.persona}</p>
                )}
                <p>spaces   : {story.storySpaces.length}개</p>
                <p>url      : /story/{story.slug}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <Link
                  href={`/owner/stories/${story.id}/edit`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [수정]
                </Link>
                <Link
                  href={`/story/${story.slug}`}
                  className="text-xs self-center"
                  style={{ color: "var(--dim)" }}
                >
                  보기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
