import { signIn } from "@/auth";

export default async function LoginPage() {
  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
          공간 경험을 기록하고,{"\n"}취향을 발견해봐
        </h1>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
        <button
          type="submit"
          className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          Google로 시작하기
        </button>
      </form>
    </main>
  );
}
