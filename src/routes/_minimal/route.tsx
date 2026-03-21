import {
  createFileRoute,
  ErrorComponentProps,
  Outlet,
} from "@tanstack/react-router";
import { useEffect } from "react";
import Button from "@/components/Button";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import { useTranslations } from "next-intl";

export const Route = createFileRoute("/_minimal")({
  component: Layout,
  errorComponent: LayoutError,
});

function Layout() {
  return (
    <div className="min-h-dvh flex justify-center items-center bg-linear-to-b from-brown-100 to-green-300 dark:from-green-700 dark:to-green-900 dark:bg-gray-900 dark:text-gray-300">
      <Outlet />
    </div>
  );
}

function LayoutError({ error, reset }: ErrorComponentProps) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex justify-center items-center bg-linear-to-b from-brown-100 to-green-300 dark:from-green-700 dark:to-green-900 dark:bg-gray-900 dark:text-gray-300">
      <ModalView
        className="max-w-[480px] w-full"
        header={
          <Button to="/login" variant="tertiary">
            {t("actions.log_in")}
          </Button>
        }
      >
        <ModalViewTitle>{t("title")}</ModalViewTitle>
        <div className="max-w-[300px] w-full mx-auto">
          <p className="mb-6">{t("help")}</p>
          <Button className="w-full" onClick={() => reset()}>
            {t("actions.reload")}
          </Button>
        </div>
      </ModalView>
    </div>
  );
}
