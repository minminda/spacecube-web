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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="flex items-center gap-3">
        <Link href="/owner" className="text-lg" style={{ color: "var(--muted)" }}>←</Link>
        <div>
          <h2 className="text-base font-medium">{space.name}</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>큐브 QR 코드</p>
        </div>
      </div>

      <div
        className="flex flex-col items-center p-8 rounded-3xl gap-6"
        style={{ background: "var(--tag-bg)" }}
      >
        <QRDownload url={qrUrl} spaceName={space.name} />
      </div>

      <div className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
        <p className="font-medium" style={{ color: "var(--fg)" }}>사용 방법</p>
        <p>1. QR 다운로드 후 인쇄하기</p>
        <p>2. 공간 안 눈에 잘 띄는 곳에 큐브와 함께 두기</p>
        <p>3. 방문자가 스캔하면 공간 페이지로 연결돼</p>
      </div>

      <div
        className="p-4 rounded-2xl text-sm"
        style={{ background: "var(--tag-bg)" }}
      >
        <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>직접 접속 주소</p>
        <p className="font-mono text-xs break-all">{qrUrl}</p>
      </div>
    </main>
  );
}
