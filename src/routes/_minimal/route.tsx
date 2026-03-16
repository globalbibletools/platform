import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_minimal")({
  component: Layout,
});

function Layout() {
  return (
    <div className="min-h-dvh flex justify-center items-center bg-linear-to-b from-brown-100 to-green-300 dark:from-green-700 dark:to-green-900 dark:bg-gray-900 dark:text-gray-300">
      <Outlet />
    </div>
  );
}
