import { getOperatorSession } from "@/lib/operatorSession";
import OperatorHeader from "./OperatorHeader";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getOperatorSession();

  return (
    <>
      <OperatorHeader hasSession={!!session} />
      {children}
    </>
  );
}
