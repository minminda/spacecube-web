import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteMaterialPdf, uploadMaterialPdf } from "@/lib/materials/cloudinary";
import { looksLikePdf, MAX_MATERIAL_FILE_SIZE } from "@/lib/materials/validation";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

/** 제목 수정, 또는 같은 자료 항목의 PDF 교체(파일이 오면 업로드 후 URL 갱신, 이전 원본은 최선을 다해 정리). */
export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "자료를 찾을 수 없어요." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });

  const titleRaw = form.get("title");
  const file = form.get("file");

  const data: {
    title?: string;
    fileUrl?: string;
    storageKey?: string;
    originalFileName?: string;
    fileSize?: number;
  } = {};

  if (typeof titleRaw === "string" && titleRaw.trim()) {
    data.title = titleRaw.trim();
  }

  let oldStorageKey: string | null = null;
  if (file instanceof File) {
    if (file.size > MAX_MATERIAL_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일이 너무 커요. 최대 ${MAX_MATERIAL_FILE_SIZE / 1024 / 1024}MB까지 가능해요.` },
        { status: 400 },
      );
    }
    // file.type(브라우저가 보고하는 MIME)은 OS/브라우저에 따라 PDF인데도 빈 문자열로 오는 경우가
    // 있어 신뢰하지 않는다 — 실제 파일 시작 바이트로만 판단한다.
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
    data.fileUrl = uploaded.secureUrl;
    data.storageKey = uploaded.publicId;
    data.originalFileName = file.name;
    data.fileSize = uploaded.bytes;
    oldStorageKey = existing.storageKey;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });
  }

  const material = await prisma.material.update({ where: { id }, data });

  if (oldStorageKey) {
    // 새 파일은 이미 저장됐으니 DB는 항상 최신 링크를 가리킨다 — 이전 원본 정리 실패는 무시(고아 파일만 남고 서비스엔 영향 없음).
    await deleteMaterialPdf(oldStorageKey).catch(() => {});
  }

  return NextResponse.json(material);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "자료를 찾을 수 없어요." }, { status: 404 });

  try {
    // 스토리지 원본을 먼저 지운다 — 실패하면 DB 레코드를 남겨서 재시도할 수 있게 하고,
    // 링크 없는 고아 파일(DB엔 없는데 Cloudinary엔 남은 상태)이 생기지 않게 한다.
    await deleteMaterialPdf(existing.storageKey);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "원본 삭제에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
