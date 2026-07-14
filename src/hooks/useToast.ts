"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 관리자 화면 곳곳에 반복 구현돼 있던 "짧게 뜨는 하단 안내 문구" 상태 로직을 통합한 훅.
 * 렌더링은 하지 않는다 — 화면에 보여줄 때는 함께 만든 <Toast/> 컴포넌트를 붙여 쓴다.
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(message);
      timerRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  return { toast, showToast };
}
