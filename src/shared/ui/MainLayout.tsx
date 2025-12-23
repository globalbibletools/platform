import { ReactNode } from "react";
import PrimaryNavigation from "@/shared/ui/PrimaryNavigation";
import Footer from "@/shared/ui/Footer";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <PrimaryNavigation />
      <div className="flex-grow relative flex flex-col w-full">{children}</div>
      <Footer />
    </div>
  );
}
