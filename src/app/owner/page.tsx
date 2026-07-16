import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ENABLE_REGION_STORIES, ENABLE_TASTE_STORIES } from "@/lib/features";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";
import DeleteSpaceButton from "./DeleteSpaceButton";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
  });

  // MVP 기간 반응보드 링크 비활성화 — true로 바꾸면 즉시 원상복구
  const SHOW_REACTION_BOARD = false;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          href="/owner/new"
          className="flex-1 min-w-[10rem] block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors text-center"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ + 새 공간 등록 ]]
        </Link>
        <Link
          href="/owner/tags"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 태그 관리 ]]
        </Link>
        <Link
          href="/owner/districts"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 지역 관리 ]]
        </Link>
        <Link
          href="/owner/content-status"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 콘텐츠 공개 상태 ]]
        </Link>
        <Link
          href="/owner/cubes"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 큐브 관리 ]]
        </Link>
        {/* MVP: 지역/취향 이야기(ContentStory) 비활성화 — features.ts 플래그를 true로 바꾸면 원상복구 */}
        {(ENABLE_REGION_STORIES || ENABLE_TASTE_STORIES) && (
          <Link
            href="/owner/stories"
            className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            [[ 지역/취향 이야기 ]]
          </Link>
        )}
      </div>

      {spaces.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 등록된 공간이 없어.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // 전체 공간 {spaces.length}개
          </p>
          {spaces.map((space) => (
            <div
              key={space.id}
              className="p-4 border space-y-3"
              style={{ borderColor: space.isActive ? "var(--border)" : "var(--border)", opacity: space.isActive ? 1 : 0.4 }}
            >
              <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                <div className="flex justify-between">
                  <p style={{ color: "var(--fg)" }}>&gt; {space.name}</p>
                  {!space.isActive && (
                    <p style={{ color: "var(--dim)" }}>[비활성]</p>
                  )}
                </div>
                <p>type     : {space.type}</p>
                <p>district : {space.district ?? "—"}</p>
                <p>loc      : {space.location}</p>
                <p>url      : /space/{space.slug}</p>
              </div>
              <div className="flex gap-3 text-xs flex-wrap">
                {/* MVP: SHOW_REACTION_BOARD = true 로 변경하면 원상복구 */}
                {SHOW_REACTION_BOARD && (
                  <Link
                    href={`/owner/${space.id}/dashboard`}
                    className="border px-3 py-1 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
                    style={{ borderColor: "var(--fg)" }}
                  >
                    [반응 보드]
                  </Link>
                )}
                <Link
                  href={`/owner/${space.id}/qr`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [QR]
                </Link>
                <Link
                  href={`/owner/${space.id}/report`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [운영 리포트]
                </Link>
                {ENABLE_MULTILINGUAL && (
                  <Link
                    href={`/owner/${space.id}/translations`}
                    className="border px-3 py-1 transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                  >
                    [다국어]
                  </Link>
                )}
                <Link
                  href={`/owner/${space.id}/edit`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [수정]
                </Link>
                <Link
                  href={`/owner/${space.id}/episodes`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [에피소드]
                </Link>
                <Link
                  href={`/owner/${space.id}/guestbook`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [방명록 관리]
                </Link>
                <Link
                  href={`/owner/${space.id}/space-tags`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [태그]
                </Link>
                <DeleteSpaceButton spaceId={space.id} spaceName={space.name} />
                <Link
                  href={`/space/${space.slug}`}
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
