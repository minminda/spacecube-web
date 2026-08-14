/**
 * EXPERIMENTAL ONLY — 손글씨 샘플 시트에 쓸 48자.
 * 19개 초성 + 21개 중성 전부(1라운드, 받침 없음) + 나머지 27개 종성(2라운드, "아"+받침 형태)을
 * 커버하도록 생성했다 — DM-Font의 memory가 요청 문자의 초성/중성/종성 각각에 대응하는 참조
 * 글자가 최소 1개씩 있어야 생성 가능하므로, 이 48자만 다 쓰면 어떤 한글 음절이든 생성 가능하다.
 * handwriting-service의 동일한 로직으로 생성한 값을 그대로 가져왔다(referenceChars.json).
 */
import referenceChars from "./referenceChars.json";

export { referenceChars };
export type ReferenceChar = string;
