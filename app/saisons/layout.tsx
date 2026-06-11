// Parallel route: the @modal slot renders the intercepted product drawer over
// the calendar (children). See @modal/(.)[slug]/page.tsx.
export default function SaisonsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
