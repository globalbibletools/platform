"use client";

import { useEffect } from "react";
import Button from "@/components/Button";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  const params = useParams<{ locale: string }>();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ModalView
      className="max-w-[480px] w-full"
      header={
        <Button href={`/${params.locale}/login`} variant="tertiary">
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
  );
}
