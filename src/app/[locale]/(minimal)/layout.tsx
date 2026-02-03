export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex justify-center items-center bg-linear-to-b from-brown-100 to-green-300 dark:from-green-700 dark:to-green-900">
      {children}
    </div>
  );
}
