/* ── 홈페이지 CMS용 이미지 업로드(클라이언트) ──────────────────────────────
   기존 관리 화면들과 같은 Cloudinary 서명 없는 업로드(upload preset)를 쓰되, 기존 파일의 업로드
   코드는 건드리지 않고 CMS 전용으로 한 곳에 모은다. 긴 변을 줄여(compressImage) 올린다. */

import { compressImage } from "@/lib/imageCompress";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export interface UploadedImage {
  url: string;
  width?: number;
  height?: number;
}

export async function uploadEditorialImage(file: File): Promise<UploadedImage> {
  // 환경변수가 빠진 배포(로컬 .env 포함)에서 Cloudinary의 영어 오류 대신 무엇이 없는지 바로 알린다
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("이미지 업로드 설정이 없어요(NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). 배포 환경변수를 확인해주세요.");
  }
  const compressed = await compressImage(file, 2400, 0.86).catch(() => file);
  const data = new FormData();
  data.append("file", compressed);
  data.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw new Error(json?.error?.message ?? "이미지 업로드에 실패했어요.");
  return { url: json.secure_url as string, width: json.width, height: json.height };
}
