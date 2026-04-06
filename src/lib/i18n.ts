export type Lang = "ko" | "en";

export async function getLang(): Promise<Lang> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  return c.get("lang")?.value === "en" ? "en" : "ko";
}
