// 기존(레거시) 홈 전용 푸터 — 원래 layout에서 pathname === "/"일 때만 렌더되던 것을, 새
// 에디토리얼 홈과 구분하기 위해 기존 홈(LegacyHome)이 직접 렌더하도록 옮겼다. 표시 내용·위치는
// 동일하다(공용 레이아웃의 폭 제한 래퍼 밖과 같도록 editorial-bleed로 뷰포트 폭 전체를 쓴다).
// 공간/방명록/아카이브 등 나머지 사용자 경험 화면은 기존대로 푸터가 없다.
export default function Footer() {
  return (
    <footer className="editorial-bleed" style={{ background: "#000" }}>
      <div className="max-w-sm md:max-w-2xl mx-auto px-6 py-4">
        <p className="text-xs" style={{ color: "#fff" }}>현재 파일럿 운영 중입니다</p>
        <div className="mt-2">
          <p className="text-xs" style={{ color: "#ccc" }}>Contact</p>
          <a href="mailto:gonggancube@gmail.com" className="text-xs" style={{ color: "#ccc" }}>
            gonggancube@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
