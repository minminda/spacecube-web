import Link from "next/link";

export default function OperatorBackLink({ slug }: { slug: string }) {
  return (
    <Link href={`/operator/${slug}`} className="no-print text-xs hover:underline underline-offset-4 -mb-2" style={{ color: "var(--a-dim)" }}>
      ← 운영 홈
    </Link>
  );
}
