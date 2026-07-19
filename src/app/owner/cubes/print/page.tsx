import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCubeUrl } from "@/lib/cube";
import PrintManager, { type PrintCube } from "./PrintManager";

interface Props {
  searchParams: Promise<{ codes?: string }>;
}

export default async function CubePrintPage({ searchParams }: Props) {
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

  const printCubes: PrintCube[] = cubes.map((c) => ({ id: c.id, code: c.code, url: getCubeUrl(c.code) }));

  return <PrintManager cubes={printCubes} />;
}
