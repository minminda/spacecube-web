import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import StoryForm from "../StoryForm";

export default async function NewStoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const spaces = await prisma.space.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true, district: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / STORIES / NEW</p>
          <Link href="/owner/stories" className="text-xs" style={{ color: "var(--dim)" }}>&lt; stories</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <StoryForm mode="new" spaces={spaces} />
    </main>
  );
}
