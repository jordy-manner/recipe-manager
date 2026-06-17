import { Suspense } from "react";
import { Breadcrumb } from "./components/breadcrumb";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Suspense so the breadcrumb's headers()/DB lookup never blocks the page
          stream; its fixed-height slot is already reserved by the body padding. */}
      <Suspense fallback={null}>
        <Breadcrumb />
      </Suspense>
      {children}
    </>
  );
}
