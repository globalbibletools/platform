import { createFileRoute, redirect } from "@tanstack/react-router";
import { isFeatureEnabled } from "@/feature-flags";
import { useTranslations } from "use-intl";

export const Route = createFileRoute("/_main/downloads")({
  beforeLoad: () => {
    if (!isFeatureEnabled("ff-downloads")) {
      throw redirect({ to: "/" });
    }
  },
  component: DownloadsRoute,
});

function DownloadsRoute() {
  const t = useTranslations("DownloadsRoute");

  return <div>{t("title")}</div>;
}
