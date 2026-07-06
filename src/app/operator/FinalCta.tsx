const MAILTO =
  "mailto:alsehd0516@gmail.com" +
  "?subject=" + encodeURIComponent("공간큐브 문의드립니다") +
  "&body=" + encodeURIComponent("안녕하세요, 공간큐브 소개 페이지를 보고 문의드립니다.\n\n공간 이름:\n위치:\n연락 가능한 시간대:\n");

export default function FinalCta() {
  return (
    <section id="contact" className="px-6 py-16 space-y-6 text-center">
      <p className="text-lg font-bold leading-snug whitespace-pre-line">
        {"공간에도 이야기가 있다고 생각하신다면\n한 번 이야기 나눠보고 싶습니다."}
      </p>
      <a
        href={MAILTO}
        className="inline-block text-sm font-medium py-3 px-8 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        문의하기
      </a>
    </section>
  );
}
