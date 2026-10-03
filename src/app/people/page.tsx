import { redirect } from "next/navigation";

/** PEOPLE 목록은 STORY 허브로 합쳐졌다 — 기존 링크(/people)는 PEOPLE 탭으로 보낸다. 상세(/people/[slug])는 그대로. */
export default function PeopleListPage() {
  redirect("/story?type=people");
}
