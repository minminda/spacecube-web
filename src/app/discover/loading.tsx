import Divider from "@/components/Divider";

export default function Loading() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / DISCOVER</p>
        <Divider />
      </div>
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        &gt; 공간을 탐색하는 중_
      </p>
    </main>
  );
}
