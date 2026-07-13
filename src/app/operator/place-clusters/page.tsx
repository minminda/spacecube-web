import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { GuestbookSessionStatus } from "@prisma/client";
import GuestbookClusterPlacer from "../GuestbookClusterPlacer";

interface Props {
  searchParams: Promise<{ spaceId?: string }>;
}

export default async function PlaceClustersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login?callbackUrl=/operator");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login?callbackUrl=/operator");

  const { spaceId } = await searchParams;
  if (!spaceId) redirect("/operator");

  const access = await requireSpaceAccess(user.id, user.email, spaceId);
  if (!access.ok) redirect("/operator");

  const draft = await prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } });
  if (!draft) notFound();

  return (
    <GuestbookClusterPlacer
      spaceId={spaceId}
      question1={draft.question1}
      question2={draft.question2}
      initial={{
        freeClusterX: draft.freeClusterX,
        freeClusterY: draft.freeClusterY,
        question1ClusterX: draft.question1ClusterX,
        question1ClusterY: draft.question1ClusterY,
        question2ClusterX: draft.question2ClusterX,
        question2ClusterY: draft.question2ClusterY,
      }}
    />
  );
}
