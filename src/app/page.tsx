import { Suspense } from "react";
import { BuildEditor } from "@/components/BuildEditor";
import { LoadingFallback } from "@/components/LoadingFallback";

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuildEditor />
    </Suspense>
  );
}
