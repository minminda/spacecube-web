import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import QRDownload from "@/components/QRDownload";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QRPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const space = await prisma.space.findUnique({ where: { id } });
  if (!space || space.ownerId !== user.id) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://spacecube-web.vercel.app";
  const qrUrl = `${baseUrl}/space/${space.slug}`;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">SPACECUBE / QR</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
        <p>&gt; {space.name}</p>
        <p>// 큐브에 붙일 QR 코드</p>
      </div>

      <div className="flex flex-col items-center p-6 border gap-6" style={{ borderColor: "var(--border)" }}>
        <QRDownload url={qrUrl} spaceName={space.name} />
      </div>

      <div className="space-y-2 text-xs" style={{ color: "var(--dim)" }}>
        <p>&gt; 사용 방법</p>
        <p>  1. QR 다운로드 후 인쇄</p>
        <p>  2. 공간 안 큐브 옆에 두기</p>
        <p>  3. 방문자가 스캔하면 공간 페이지로 연결</p>
      </div>

      <div className="p-3 border space-y-1" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 접속 주소</p>
        <p className="text-xs font-mono break-all">{qrUrl}</p>
      </div>
    </main>
  );
}
