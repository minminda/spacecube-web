import crypto from "crypto";
import { NextResponse } from "next/server";
import { archiveCaller } from "@/lib/archive/apiAuth";

export const dynamic = "force-dynamic";

/**
 * 아카이브 사진 서명 업로드 — 로그인 사용자만, 사용자 폴더(archive/<userId>)로만 올라가게 서버가 서명한다.
 * 브라우저가 Cloudinary로 직접 올리므로 서버를 거치지 않는다. 저장 API는 이 폴더의 주소만 받는다.
 */
export async function POST() {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "사진 업로드 설정이 없어요." }, { status: 503 });
  const folder = `archive/${caller.userId}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder }, { headers: { "Cache-Control": "no-store" } });
}
