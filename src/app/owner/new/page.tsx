import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SpaceForm from "../SpaceForm";

export default async function NewSpacePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return <SpaceForm mode="new" />;
}
