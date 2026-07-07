import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import GuestbookCanvas from "./GuestbookCanvas";
import type { GuestbookNoteData } from "./dummyNotes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { name: true },
  });
  if (!space) return {};
  return {
    title: `${space.name}에 남겨진 흔적 — 공간큐브`,
    description: "이 공간을 다녀간 사람들이 남긴 작은 기록들입니다.",
  };
}

function formatDate(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function GuestbookPage({ params }: Props) {
  const { slug } = await params;

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!space) notFound();

  const session = await auth();
  let myNoteId: string | null = null;

  const [dbNotes, user] = await Promise.all([
    prisma.guestbookNote.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true, content: true, x: true, y: true, rotation: true, color: true, createdAt: true },
    }),
    session?.user?.email
      ? prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (user) {
    myNoteId = dbNotes.find((n) => n.userId === user.id)?.id ?? null;
  }

  const initialNotes: GuestbookNoteData[] = dbNotes.map((n) => ({
    id: n.id,
    content: n.content,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    color: n.color,
    createdAt: formatDate(n.createdAt),
  }));

  return (
    <main>
      <Suspense fallback={null}>
        <GuestbookCanvas
          space={space}
          initialNotes={initialNotes}
          isLoggedIn={!!session?.user?.email}
          initialMyNoteId={myNoteId}
        />
      </Suspense>
    </main>
  );
}
