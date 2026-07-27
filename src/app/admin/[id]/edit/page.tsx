import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import SpaceForm from "../../SpaceForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSpacePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;
  const [space, categories, spaceTagLinks] = await Promise.all([
    prisma.space.findUnique({ where: { id } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { tags: { where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true } } },
    }),
    prisma.spaceTag.findMany({ where: { spaceId: id }, select: { tagId: true, weight: true, isPrimary: true, visibleToUsers: true } }),
  ]);
  if (!space) notFound();

  return (
    <SpaceForm
      mode="edit"
      categories={categories}
      existingTagLinks={spaceTagLinks}
      space={{
        id: space.id,
        name: space.name,
        slug: space.slug,
        district: space.district ?? "",
        location: space.location,
        tagline: space.tagline ?? "",
        openingHours: space.openingHours ?? "",
        naverMapUrl: space.naverMapUrl ?? "",
        description: space.description,
        imageUrl: space.imageUrl ?? "",
        imageZoom: space.imageZoom ?? 1,
        imagePositionX: space.imagePositionX ?? 0.5,
        imagePositionY: space.imagePositionY ?? 0.5,
        ownerName: space.ownerName ?? "",
        ownerPhotoUrl: space.ownerPhotoUrl ?? "",
        ownerBio: space.ownerBio ?? "",
        hasOperatorPin: !!space.operatorPinHash,
      }}
    />
  );
}
