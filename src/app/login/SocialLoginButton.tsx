"use client";

import { useFormStatus } from "react-dom";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

// <form action={서버 액션}>의 자식으로 렌더링 — useFormStatus가 가장 가까운 부모 form의
// 제출 상태를 읽어온다. 제출 중에는 비활성화해 중복 클릭(중복 로그인 시도)을 막는다.
export default function SocialLoginButton({ children, style, className }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`tap-target w-full text-sm font-medium py-3 border transition-opacity disabled:opacity-60 ${className ?? ""}`}
      style={style}
    >
      {pending ? "이동 중..." : children}
    </button>
  );
}
