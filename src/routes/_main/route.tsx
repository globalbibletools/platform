import { createFileRoute, Outlet } from "@tanstack/react-router";
import Button from "@/components/Button";
import PrimaryNavigation from "@/shared/ui/PrimaryNavigation";
import Footer from "@/shared/ui/Footer";
import { useTranslations } from "next-intl";
import { ReactNode, useEffect } from "react";

export const Route = createFileRoute("/_main")({
  component: RouteComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 dark:text-gray-300">
      <PrimaryNavigation />
      {children}
      <Footer />
    </div>
  );
}

function RouteComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Layout>
      <div className="absolute w-full h-full flex items-center justify-center">
        <div className="max-w-[400px] grow mx-4 p-8 rounded-lg border border-gray-300 shadow-sm">
          <h2 className="font-bold text-xl mb-4">{t("title")}</h2>
          <p className="mb-6">{t("help")}</p>
          <Button onClick={() => reset()}>{t("actions.reload")}</Button>
        </div>
      </div>
    </Layout>
  );
}

function NotFoundComponent() {
  const t = useTranslations("RootNotFoundPage");

  return (
    <Layout>
      <div className="grow flex items-center justify-center">
        <h1 className="text-lg font-bold">{t("title")}</h1>
      </div>
    </Layout>
  );
}
