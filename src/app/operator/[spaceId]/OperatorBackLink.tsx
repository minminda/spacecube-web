import Link from "next/link";

export default function OperatorBackLink({ spaceId }: { spaceId: string }) {
  return (
    <Link href={`/operator/${spaceId}`} className="text-xs" style={{ color: "var(--dim)" }}>
      ← 운영자 관리 홈으로 돌아가기
    </Link>
  );
}
