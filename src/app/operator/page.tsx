import type { Metadata } from "next";
import MonthlyOperatorPage from "./MonthlyOperatorPage";

export const metadata: Metadata = {
  title: "월간 운영 — 공간큐브",
  description: "한 달 동안 쌓인 공간의 기록을 돌아보고, 다음 달을 준비하는 페이지입니다.",
};

export default function OperatorPage() {
  return <MonthlyOperatorPage />;
}
