import { ReactNode } from "react";
import PrimaryNavigation from "@/shared/ui/PrimaryNavigation";
import Footer from "@/shared/ui/Footer";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PrimaryNavigation />
      {children}
      <Footer />
    </div>
  );
}
