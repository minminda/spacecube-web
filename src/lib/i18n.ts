export type Lang = "ko" | "en" | "ja";

export async function getLang(): Promise<Lang> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  const val = c.get("lang")?.value;
  if (val === "en") return "en";
  if (val === "ja") return "ja";
  return "ko";
}
