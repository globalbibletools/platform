import { requestInterlinearExport } from "@/modules/export/actions/requestInterlinearExport";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { JobStatus } from "@/shared/jobs/model";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import exportJobQueryService from "../data-access/ExportJobQueryService";
import JobStatusPoller from "@/shared/jobs/ui/JobStatusPoller";
import { useTranslations } from "use-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const requestSchema = z.object({
  languageCode: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export const getInterlinearExportPanelData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async ({ data }) => {
    const [jobs, pendingJob] = await Promise.all([
      exportJobQueryService.findRecentForLanguage(data.languageCode),
      exportJobQueryService.findPendingForLanguage(data.languageCode),
    ]);

    return { jobs, pendingJob };
  });

export default function InterlinearExportPanel({
  languageCode,
}: {
  languageCode: string;
}) {
  const t = useTranslations("InterlinearExport");

  const { data, refetch } = useSuspenseQuery({
    queryKey: ["interlinear-export-panel", languageCode],
    queryFn: () => getInterlinearExportPanelData({ data: { languageCode } }),
  });

  const { jobs, pendingJob } = data;

  const statusLabels = {
    [JobStatus.Pending]: t("status.labels.pending"),
    [JobStatus.InProgress]: t("status.labels.in_progress"),
    [JobStatus.Complete]: t("status.labels.complete"),
    [JobStatus.Failed]: t("status.labels.error"),
  };

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 pb-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
      <div className="grow">
        <h3 className="font-bold text-lg mb-2 flex items-start gap-2">
          <Icon icon="file-arrow-down" className="mt-1" />
          <span>{t("title")}</span>
        </h3>
        <p className="text-sm max-w-xl">{t("description")}</p>
      </div>

      <div className="shrink-0 w-full lg:w-80">
        <Button
          disabled={!!pendingJob}
          onClick={async () => {
            await requestInterlinearExport({ data: { languageCode } });
            await refetch();
          }}
        >
          {pendingJob ? t("form.queued") : t("form.submit")}
        </Button>

        {jobs.length > 0 && (
          <div className="mt-4 text-sm border-t border-green-300 dark:border-blue-800 pt-3">
            <div className="font-semibold mb-2">{t("status.title")}</div>
            <div className="flex flex-col gap-3">
              {jobs.map((job) => {
                const isComplete = job.status === JobStatus.Complete;
                const isFailed = job.status === JobStatus.Failed;
                const statusLabel = statusLabels[job.status] ?? job.status;
                const createdAt = new Date(job.createdAt).toLocaleString();
                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-1 rounded-md border border-green-200 dark:border-blue-800 p-3"
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <div>
                        <div className="font-semibold">{createdAt}</div>
                      </div>
                      <span className="uppercase text-xs px-2 py-1 rounded-sm bg-gray-100 dark:bg-gray-700">
                        {statusLabel}
                      </span>
                    </div>
                    {job.data?.downloadUrl && (
                      <div className="flex items-center gap-2">
                        <Button
                          href={job.data.downloadUrl}
                          variant="secondary"
                          target="_blank"
                        >
                          <Icon icon="download" className="me-1" />{" "}
                          {t("status.download")}
                        </Button>
                        {job.data.expiresAt && (
                          <span className="text-xs text-gray-500">
                            {t("status.expires")}:{" "}
                            {new Date(job.data.expiresAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {isFailed && (
                      <span className="text-xs text-red-500">
                        {t("status.failed")}
                      </span>
                    )}
                    {!isComplete && !isFailed && (
                      <span className="text-xs text-gray-500">
                        {t("status.generating")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingJob && (
          <JobStatusPoller jobId={pendingJob.id} onComplete={() => refetch()} />
        )}
      </div>
    </section>
  );
}
