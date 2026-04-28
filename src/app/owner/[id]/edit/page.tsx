import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import SpaceForm from "../../SpaceForm";
import type { StoryItem } from "@/app/space/[slug]/SpaceStory";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSpacePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) notFound();

  return (
    <SpaceForm
      mode="edit"
      space={{
        id: space.id,
        name: space.name,
        slug: space.slug,
        type: space.type,
        district: space.district ?? "",
        location: space.location,
        tagline: space.tagline ?? "",
        openingHours: space.openingHours ?? "",
        naverMapUrl: space.naverMapUrl ?? "",
        description: space.description,
        spaceTags: space.spaceTags ?? [],
        imageUrl: space.imageUrl ?? "",
        storyItems: (space.storyItems as StoryItem[]) ?? [],
      }}
    />
  );
}
