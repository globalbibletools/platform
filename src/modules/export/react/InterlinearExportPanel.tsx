import { requestInterlinearExport } from "@/modules/export/actions/requestInterlinearExport";
import { pollInterlinearExportStatus } from "@/modules/export/actions/pollInterlinearExportStatus";
import InterlinearExportPanelClient from "./InterlinearExportPanelClient";
import { getTranslations } from "next-intl/server";
import { JobStatus } from "@/shared/jobs/model";

export default async function InterlinearExportPanel({
  languageCode,
}: {
  languageCode: string;
}) {
  const t = await getTranslations("InterlinearExport");

  return (
    <InterlinearExportPanelClient
      languageCode={languageCode}
      strings={{
        title: t("title"),
        description: t("description"),
        submit: t("form.submit"),
        queued: t("form.queued"),
        statusTitle: t("status.title"),
        allBooksLabel: t("status.all_books"),
        downloadLabel: t("status.download"),
        expiresLabel: t("status.expires"),
        generatingLabel: t("status.generating"),
        failedLabel: t("status.failed"),
        missingLabel: t("status.missing"),
        statusLabels: {
          [JobStatus.Pending]: t("status.labels.pending"),
          [JobStatus.InProgress]: t("status.labels.in_progress"),
          [JobStatus.Complete]: t("status.labels.complete"),
          [JobStatus.Failed]: t("status.labels.error"),
        },
      }}
      requestExport={requestInterlinearExport}
      pollExportStatus={pollInterlinearExportStatus}
    />
  );
}
