import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import CodeStickerManager, { type StickerCube } from "./CodeStickerManager";

interface Props {
  searchParams: Promise<{ codes?: string }>;
}

export default async function CubeCodeStickerPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { codes } = await searchParams;
  const codeList = codes ? codes.split(",").map((c) => c.trim()).filter(Boolean) : null;

  const cubes = await prisma.cube.findMany({
    where: codeList ? { code: { in: codeList } } : undefined,
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const stickerCubes: StickerCube[] = cubes.map((c) => ({ id: c.id, code: c.code }));

  return <CodeStickerManager cubes={stickerCubes} />;
}
