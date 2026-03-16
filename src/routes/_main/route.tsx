import { createFileRoute, Outlet } from "@tanstack/react-router";
import PrimaryNavigation from "@/shared/ui/PrimaryNavigation";
import Footer from "@/shared/ui/Footer";

export const Route = createFileRoute("/_main")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 dark:text-gray-300">
      <PrimaryNavigation />
      <Outlet />
      <Footer />
    </div>
  );
}
