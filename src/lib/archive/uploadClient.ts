/* ── 아카이브 사진 업로드(클라이언트) ─────────────────────────────────────────
   서버에서 사용자 폴더 전용 서명을 받아 Cloudinary로 바로 올린다(서버를 거치지 않음). 긴 변 2000px로 줄여 올리고,
   동시에 3장씩. 실패한 사진이 있으면 전체를 실패로 돌려 "올라간 줄 알았는데 빠진" 기록이 없게 한다. ── */

import { compressImage } from "@/lib/imageCompress";
import type { PhotoInput } from "./input";

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
}

async function getSignature(): Promise<Signature> {
  const res = await fetch("/api/archive/upload-signature", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("로그인이 필요해요.");
  if (!res.ok) throw new Error(data.error ?? "사진을 올릴 준비를 하지 못했어요.");
  return data as Signature;
}

async function uploadOne(file: File, sig: Signature): Promise<PhotoInput> {
  const compressed = await compressImage(file, 2000, 0.85).catch(() => file);
  const form = new FormData();
  form.append("file", compressed);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw new Error(json?.error?.message ?? "사진을 올리지 못했어요.");
  return { url: json.secure_url as string, width: json.width, height: json.height };
}

export async function uploadArchivePhotos(files: File[], onProgress?: (done: number, total: number) => void): Promise<PhotoInput[]> {
  if (files.length === 0) return [];
  const sig = await getSignature();
  const out: PhotoInput[] = new Array(files.length);
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      out[i] = await uploadOne(files[i], sig);
      onProgress?.(++done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return out;
}
