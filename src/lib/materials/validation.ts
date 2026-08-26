// Vercel 서버리스 함수는 요청 본문이 4.5MB를 넘으면 우리 코드가 실행되기도 전에
// 플랫폼이 413으로 끊는다. multipart 오버헤드를 감안해 4MB를 앱 레벨 상한으로 둔다.
export const MAX_MATERIAL_FILE_SIZE = 4 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

/** 확장자/브라우저가 보낸 MIME은 조작 가능하니, 실제 파일 시작 바이트(매직 넘버)까지 확인한다. */
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).toString("latin1") === PDF_MAGIC;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
