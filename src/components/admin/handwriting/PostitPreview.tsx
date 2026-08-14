/* EXPERIMENTAL ONLY — 실제 GuestbookCanvas 포스트잇 오버레이(src/app/space/[slug]/guestbook/
   GuestbookCanvas.tsx의 "포스트잇 확대 오버레이" read 모드)와 동일한 배경색/패딩/그림자를
   재사용해 미리보기만 제공한다. 실제 GuestbookNote 테이블에는 저장하지 않는다. */
import SentenceRenderer, { type CharResult } from "./SentenceRenderer";

const POSTIT_COLOR = "#F6E7A8";
const INK = "#3d3524";
const INK_DIM = "#8a7d5c";

interface Props {
  text: string;
  results: Record<string, CharResult>;
  nickname: string;
}

export default function PostitPreview({ text, results, nickname }: Props) {
  return (
    <div className="flex items-center justify-center p-8" style={{ background: "rgba(0,0,0,0.82)" }}>
      <div
        className="relative w-full max-w-xs p-6"
        style={{ background: POSTIT_COLOR, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
      >
        <div className="leading-relaxed break-keep">
          <SentenceRenderer text={text} results={results} glyphSize={30} ink={INK} />
        </div>
        <p className="text-sm mt-3" style={{ color: INK_DIM }}>— {nickname}</p>
      </div>
    </div>
  );
}
