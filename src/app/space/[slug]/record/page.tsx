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

  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
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

  return (
    <RecordForm
      space={{ id: space.id, name: space.name, slug: space.slug, tagline: space.tagline }}
      spaceTags={space.spaceTags}
      visitCount={visitCount}
      previousRecord={lastRecord ? { tags: lastRecord.tags.map((t) => t.tag), tasteScore: lastRecord.tasteScore } : null}
      intent={intent}
    />
  );
}
