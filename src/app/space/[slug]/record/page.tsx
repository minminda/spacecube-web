import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import RecordForm from "./RecordForm";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ intent?: string }>;
}

export default async function RecordPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { intent: intentParam } = await searchParams;
  const intent = intentParam === "unlock" ? "unlock" : "record";

  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    include: {
      spaceTagLinks: {
        where: { visibleToUsers: true, tag: { isActive: true } },
        orderBy: { weight: "desc" },
        include: { tag: { select: { name: true } } },
      },
    },
  });
  if (!space) notFound();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) notFound();

  const previousRecords = await prisma.record.findMany({
    where: { userId: user.id, spaceId: space.id },
    include: { tags: true },
    orderBy: { visitedAt: "desc" },
  });

  const visitCount = previousRecords.length;
  const lastRecord = previousRecords[0] ?? null;

  // 관리자가 연결한 활성 태그가 있으면 그 이름을 쓰고, 없으면 기존 레거시 태그로 폴백
  const displayTags = space.spaceTagLinks.length > 0
    ? space.spaceTagLinks.slice(0, 6).map((l) => l.tag.name)
    : null;

  return (
    <RecordForm
      space={{ id: space.id, name: space.name, slug: space.slug, tagline: space.tagline }}
      spaceTags={space.spaceTags}
      displayTags={displayTags}
      visitCount={visitCount}
      previousRecord={lastRecord ? { tags: lastRecord.tags.map((t) => t.tag), tasteScore: lastRecord.tasteScore } : null}
      intent={intent}
    />
  );
}
