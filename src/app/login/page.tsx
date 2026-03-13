import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-10">
      <div className="text-center space-y-3">
        <div className="text-4xl font-thin tracking-widest">□</div>
        <h1 className="text-xl font-medium">공간큐브</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          공간 경험을 기록하고<br />
          취향을 발견해봐.
        </p>
      </div>

      <div className="w-full space-y-3">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full py-3 rounded-full text-sm border flex items-center justify-center gap-2"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          >
            <GoogleIcon />
            Google로 시작하기
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
        fill="#4285F4"
      />
      <path
        d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"
        fill="#34A853"
      />
      <path
        d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"
        fill="#FBBC05"
      />
      <path
        d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"
        fill="#EA4335"
      />
    </svg>
  );
}
