import crypto from "crypto";

/* ── PDF 자료 저장(Cloudinary, signed) ──────────────────────────────────
   이 프로젝트의 기존 이미지 업로드는 클라이언트가 unsigned preset으로 Cloudinary에
   직접 올리는 방식이라 서버가 요청을 가로챌 수 없다(누구나 preset 이름만 알면 우회 가능).
   관리자 전용 PDF 자료는 반드시 서버가 인가를 검증한 뒤 업로드해야 하므로, 여기서는
   CLOUDINARY_API_KEY/API_SECRET으로 서버가 직접 서명(signed)해서 raw 리소스로 올린다.
──────────────────────────────────────────────────────────────────────── */

function getConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary 설정이 없어요. CLOUDINARY_API_KEY/API_SECRET 환경변수를 확인해주세요.");
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export interface UploadedMaterial {
  secureUrl: string;
  publicId: string;
  bytes: number;
}

/** PDF 버퍼를 Cloudinary raw 리소스로 서명 업로드한다. public_id는 매번 새로 만들어 충돌을 피한다. */
export async function uploadMaterialPdf(file: Buffer): Promise<UploadedMaterial> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const publicId = `materials/${crypto.randomUUID()}.pdf`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign({ public_id: publicId, timestamp }, apiSecret);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: "application/pdf" }), "material.pdf");
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Cloudinary 업로드에 실패했어요.");
  }
  return { secureUrl: data.secure_url, publicId: data.public_id, bytes: data.bytes };
}

/** storageKey(public_id)로 Cloudinary raw 리소스를 지운다. 이미 없는 경우도 성공으로 취급한다. */
export async function deleteMaterialPdf(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign({ public_id: publicId, timestamp }, apiSecret);

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? "Cloudinary 삭제에 실패했어요.");
  }
}
