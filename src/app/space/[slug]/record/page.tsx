import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import RecordForm from "./RecordForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RecordPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) notFound();

  const existingRecord = await prisma.record.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId: space.id } },
    include: { tags: true },
  });

  return (
    <RecordForm
      space={{ id: space.id, name: space.name, slug: space.slug }}
      existingTags={existingRecord?.tags.map((t) => t.tag) ?? []}
      existingMemo={existingRecord?.memo ?? ""}
    />
  );
}
