import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import SpaceForm from "../SpaceForm";

export default async function NewSpacePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: { tags: { where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true } } },
  });

  return <SpaceForm mode="new" categories={categories} />;
}
