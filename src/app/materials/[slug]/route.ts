import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

/**
 * 운영자에게 공유하는 공개 PDF 링크(/materials/{slug}.pdf) — 로그인 불필요.
 * Cloudinary 도메인을 그대로 노출하지 않도록, 우리 서버가 원본을 받아와 우리 도메인으로 흘려보낸다.
 */
export async function GET(_req: Request, { params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase().endsWith(".pdf") ? rawSlug.slice(0, -4) : rawSlug;

  const material = await prisma.material.findUnique({ where: { slug } });
  if (!material) {
    return NextResponse.json({ error: "자료를 찾을 수 없어요." }, { status: 404 });
  }

  const upstream = await fetch(material.fileUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "파일을 불러올 수 없어요." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(material.originalFileName)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
