import QRCode from "qrcode";

/** QR 모듈(흑백 격자) 원본 데이터 — PDF에 벡터 사각형으로 직접 그리기 위한 것.
 * qrcode 라이브러리의 canvas/PNG 렌더러를 거치지 않으므로 래스터화가 전혀 없다. */
export interface QrMatrix {
  /** 한 변의 모듈 개수(quiet zone 제외) */
  size: number;
  isDark(row: number, col: number): boolean;
}

export function buildQrMatrix(text: string, errorCorrectionLevel: "L" | "M" | "Q" | "H" = "H"): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { size, data } = qr.modules;
  return {
    size,
    isDark(row: number, col: number) {
      return (data[row * size + col] & 1) === 1;
    },
  };
}
