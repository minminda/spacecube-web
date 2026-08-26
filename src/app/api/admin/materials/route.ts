import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { uploadMaterialPdf } from "@/lib/materials/cloudinary";
import { looksLikePdf, MAX_MATERIAL_FILE_SIZE } from "@/lib/materials/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });

  const titleRaw = form.get("title");
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const file = form.get("file");

  if (!title) return NextResponse.json({ error: "제목은 필수예요." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없어요." }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF 파일만 업로드할 수 있어요." }, { status: 400 });
  }
  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    return NextResponse.json(
      { error: `파일이 너무 커요. 최대 ${MAX_MATERIAL_FILE_SIZE / 1024 / 1024}MB까지 가능해요.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikePdf(buffer)) {
    return NextResponse.json({ error: "올바른 PDF 파일이 아니에요." }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await uploadMaterialPdf(buffer);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "업로드에 실패했어요." }, { status: 502 });
  }

  const material = await prisma.material.create({
    data: {
      title,
      fileUrl: uploaded.secureUrl,
      storageKey: uploaded.publicId,
      originalFileName: file.name,
      fileSize: uploaded.bytes,
    },
  });

  return NextResponse.json(material, { status: 201 });
}
