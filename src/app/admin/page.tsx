import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ENABLE_REGION_STORIES, ENABLE_TASTE_STORIES } from "@/lib/features";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import DeleteSpaceButton from "./DeleteSpaceButton";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
    include: { spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } } },
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
          href="/admin/new"
          className="flex-1 min-w-[10rem] block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors text-center"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ + 새 공간 등록 ]]
        </Link>
        <Link
          href="/admin/tags"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 태그 관리 ]]
        </Link>
        <Link
          href="/admin/districts"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 지역 관리 ]]
        </Link>
        <Link
          href="/admin/content-status"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 콘텐츠 공개 상태 ]]
        </Link>
        <Link
          href="/admin/cubes"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 큐브 관리 ]]
        </Link>
        <Link
          href="/admin/interview"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 인터뷰 질문 관리 ]]
        </Link>
        <Link
          href="/admin/materials"
          className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          [[ 자료 관리 ]]
        </Link>
        {/* MVP: 지역/취향 이야기(ContentStory) 비활성화 — features.ts 플래그를 true로 바꾸면 원상복구 */}
        {(ENABLE_REGION_STORIES || ENABLE_TASTE_STORIES) && (
          <Link
            href="/admin/stories"
            className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            [[ 지역/취향 이야기 ]]
          </Link>
        )}
        {/* 손글씨 PoC 메뉴는 관리자 화면에서만 숨김 — 코드/페이지/API는 전부 그대로 보존되어 있고,
            /admin/handwriting-test로 직접 접근하면 여전히 동작한다(ENABLE_HANDWRITING_POC 플래그 로직도
            불변). 다시 노출하려면 아래 주석을 해제하고 파일 상단에
            `import { ENABLE_HANDWRITING_POC } from "@/lib/handwriting/features";`를 다시 추가하면 된다.
        {ENABLE_HANDWRITING_POC && (
          <Link
            href="/admin/handwriting-test"
            className="flex-1 min-w-[8rem] block text-sm py-2 px-4 border transition-colors text-center"
            style={{ borderColor: "#c0392b", color: "#c0392b" }}
          >
            [[ 손글씨 실험 ]]
          </Link>
        )}
        */}
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
                <p>type     : {resolveSpaceTypeLabel(space.spaceTagLinks, space.type)}</p>
                <p>district : {space.district ?? "—"}</p>
                <p>loc      : {space.location}</p>
                <p>url      : /space/{space.slug}</p>
              </div>
              <div className="flex gap-3 text-xs flex-wrap">
                {/* MVP: SHOW_REACTION_BOARD = true 로 변경하면 원상복구 */}
                {SHOW_REACTION_BOARD && (
                  <Link
                    href={`/admin/${space.id}/dashboard`}
                    className="border px-3 py-1 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
                    style={{ borderColor: "var(--fg)" }}
                  >
                    [반응 보드]
                  </Link>
                )}
                <Link
                  href={`/admin/${space.id}/qr`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [QR]
                </Link>
                <Link
                  href={`/admin/${space.id}/report`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [운영 리포트]
                </Link>
                {ENABLE_MULTILINGUAL && (
                  <Link
                    href={`/admin/${space.id}/translations`}
                    className="border px-3 py-1 transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                  >
                    [다국어]
                  </Link>
                )}
                <Link
                  href={`/admin/${space.id}/edit`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [수정]
                </Link>
                <Link
                  href={`/admin/${space.id}/episodes`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [에피소드]
                </Link>
                <Link
                  href={`/admin/${space.id}/guestbook`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [방명록 관리]
                </Link>
                <Link
                  href={`/admin/${space.id}/space-tags`}
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
