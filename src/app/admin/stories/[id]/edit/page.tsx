import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import StoryForm from "../../StoryForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditStoryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;

  const [story, spaces] = await Promise.all([
    prisma.contentStory.findUnique({
      where: { id },
      include: { storySpaces: { orderBy: { order: "asc" }, select: { spaceId: true } } },
    }),
    prisma.space.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, district: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!story) notFound();

  const initialData = {
    id: story.id,
    type: story.type,
    title: story.title,
    slug: story.slug,
    district: story.district,
    persona: story.persona,
    imageUrl: story.imageUrl,
    intro: story.intro,
    body: story.body,
    bodyBlocks: Array.isArray(story.bodyBlocks) ? story.bodyBlocks as import("../../StoryForm").Block[] : null,
    cta: story.cta,
    publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
    isActive: story.isActive,
    spaceIds: story.storySpaces.map((s) => s.spaceId),
  };

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / STORIES / EDIT</p>
          <Link href="/admin/stories" className="text-xs" style={{ color: "var(--dim)" }}>&lt; stories</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <StoryForm mode="edit" initialData={initialData} spaces={spaces} />
    </main>
  );
}
