import { redirect } from "next/navigation";

/** THOUGHT 목록은 STORY 허브의 THOUGHT 탭이다. */
export default function ThoughtListPage() {
  redirect("/story?type=thought");
}
