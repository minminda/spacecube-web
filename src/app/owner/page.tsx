import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { spaces: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) redirect("/login");

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">내 공간 관리</h1>
        <Link href="/" className="text-xs" style={{ color: "var(--muted)" }}>홈</Link>
      </div>

      <Link
        href="/owner/new"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm border"
        style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
      >
        + 새 공간 등록
      </Link>

      {user.spaces.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-4xl font-thin" style={{ color: "var(--border)" }}>□</div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            아직 등록한 공간이 없어.<br />
            공간을 등록하면 방문자가 큐브를 스캔할 수 있어.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {user.spaces.map((space) => (
            <div
              key={space.id}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: "var(--tag-bg)" }}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{space.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {space.type} · {space.location}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  /space/{space.slug}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link
                  href={`/owner/${space.id}/edit`}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "var(--fg)", color: "var(--bg)" }}
                >
                  수정
                </Link>
                <Link
                  href={`/space/${space.slug}`}
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  공간 보기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
