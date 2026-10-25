import { NextResponse, type NextRequest } from "next/server";

/* 촬영 전용 — 이 브라우저에서만 HOME 「엄선한 공간」 선반 맨 앞에 지정 공간을 올린다(쿠키 demoShot).
   /demo-shot            → aka-coffee-room 켜기(12시간)
   /demo-shot?slug=xxx   → 다른 공간
   /demo-shot?off=1      → 끄기
   다른 사용자 · 다른 브라우저에는 영향이 없다. DB · 추천 가중치는 건드리지 않는다. */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const res = NextResponse.redirect(new URL("/", req.url));
  if (q.get("off")) {
    res.cookies.delete("demoShot");
    return res;
  }
  const slug = q.get("slug") ?? "aka-coffee-room";
  if (/^[a-z0-9-]{1,60}$/.test(slug)) res.cookies.set("demoShot", slug, { path: "/", maxAge: 60 * 60 * 12, httpOnly: true, sameSite: "lax", secure: true });
  return res;
}
