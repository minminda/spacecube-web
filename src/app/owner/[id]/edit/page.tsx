import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SpaceForm from "../../SpaceForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSpacePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const space = await prisma.space.findUnique({ where: { id } });
  if (!space || space.ownerId !== user.id) notFound();

  return (
    <SpaceForm
      mode="edit"
      space={{
        id: space.id,
        name: space.name,
        slug: space.slug,
        type: space.type,
        location: space.location,
        description: space.description,
        philosophy: space.philosophy,
        ownerMessage: space.ownerMessage ?? "",
      }}
    />
  );
}
