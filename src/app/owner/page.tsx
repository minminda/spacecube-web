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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">SPACECUBE / OWNER</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <Link
        href="/owner/new"
        className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        [[ + 새 공간 등록 ]]
      </Link>

      {user.spaces.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 아직 등록한 공간이 없어.<br />
          &nbsp;&nbsp;공간을 등록하면 방문자가 스캔할 수 있어.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 내 공간 목록</p>
          {user.spaces.map((space) => (
            <div
              key={space.id}
              className="p-4 border space-y-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                <p style={{ color: "var(--fg)" }}>&gt; {space.name}</p>
                <p>type : {space.type}</p>
                <p>loc  : {space.location}</p>
                <p>url  : /space/{space.slug}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <Link href={`/owner/${space.id}/qr`} className="border px-3 py-1 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors" style={{ borderColor: "var(--fg)" }}>
                  [QR]
                </Link>
                <Link href={`/owner/${space.id}/edit`} className="border px-3 py-1 transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                  [수정]
                </Link>
                <Link href={`/space/${space.slug}`} className="text-xs self-center" style={{ color: "var(--dim)" }}>
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
