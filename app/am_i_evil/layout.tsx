export default function HealthCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`body { background-color: green; }`}</style>
      {children}
    </>
  );
}
