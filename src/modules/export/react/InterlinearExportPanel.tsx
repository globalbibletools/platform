import { requestInterlinearExport } from "@/modules/export/actions/requestInterlinearExport";
import { pollInterlinearExportStatus } from "@/modules/export/actions/pollInterlinearExportStatus";
import InterlinearExportPanelClient from "./InterlinearExportPanelClient";
import { getTranslations } from "next-intl/server";

export default async function InterlinearExportPanel({
  languageCode,
  books,
}: {
  languageCode: string;
  books: { id: number; name: string }[];
}) {
  const t = await getTranslations("InterlinearExport");

  return (
    <InterlinearExportPanelClient
      languageCode={languageCode}
      books={books}
      strings={{
        title: t("title"),
        description: t("description"),
        booksLabel: t("form.books_label"),
        booksPlaceholder: t("form.books_placeholder"),
        booksHelp: t("form.books_help"),
        chaptersLabel: t("form.chapters_label"),
        chaptersPlaceholder: t("form.chapters_placeholder"),
        layoutLabel: t("form.layout_label"),
        layoutStandard: t("form.layout_standard"),
        layoutParallel: t("form.layout_parallel"),
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
          PENDING: t("status.labels.PENDING"),
          IN_PROGRESS: t("status.labels.IN_PROGRESS"),
          COMPLETE: t("status.labels.COMPLETE"),
          FAILED: t("status.labels.FAILED"),
        },
      }}
      requestExport={requestInterlinearExport}
      pollExportStatus={pollInterlinearExportStatus}
    />
  );
}
