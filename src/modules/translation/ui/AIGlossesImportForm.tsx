import LoadingSpinner from "@/components/LoadingSpinner";
import { Icon } from "@/components/Icon";
import ServerAction from "@/components/ServerAction";
import { importAIGlosses } from "../actions/importAIGlosses";
import { getAIGlossImportJobReadModel } from "../read-models/getAIGlossImportJobReadModel";
import { JobStatus } from "@/shared/jobs/model";
import { getAIGlossImportLanguagesReadModel } from "../read-models/getAIGlossImportLanguagesReadModel";
import { getClientTimezone } from "@/shared/i18n/getClientTimezone";
import { getLocale } from "next-intl/server";
import JobStatusPoller from "@/shared/jobs/ui/JobStatusPoller";

export default async function AIGlossesImportForm({ code }: { code: string }) {
  const job = await getAIGlossImportJobReadModel(code);
  const tz = await getClientTimezone();
  const locale = await getLocale();

  if (
    job?.status === JobStatus.Pending ||
    job?.status === JobStatus.InProgress
  ) {
    return (
      <>
        <p className="mb-2">AI gloss import running</p>
        <LoadingSpinner className="w-fit" />
        <JobStatusPoller jobId={job.id} />
      </>
    );
  } else {
    const availableLanguages = await getAIGlossImportLanguagesReadModel();
    const language = availableLanguages.find((lang) => lang.code === code);
    if (!language) {
      return (
        <p className="flex gap-2 items-top">
          <Icon
            icon="exclamation-circle"
            className="text-green-400 mt-[2px]"
            size="lg"
          />
          This language is not available for import.
        </p>
      );
    }

    return (
      <>
        {job && (
          <div className="mb-4 flex gap-2 items-top">
            {job.status === JobStatus.Complete ?
              <Icon
                icon="check-circle"
                className="text-green-400 mt-[2px]"
                size="lg"
              />
            : <Icon
                icon="exclamation-triangle"
                className="text-red-700 mt-[2px]"
                size="lg"
              />
            }
            <div>
              <p>
                {job.status === JobStatus.Complete ?
                  "Imported AI glosses successfully!"
                : "Error importing AI glosses"}
              </p>
              <p className="italic text-sm">
                {new Intl.DateTimeFormat(locale, {
                  timeZone: tz,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(job.updatedAt)}
              </p>
            </div>
          </div>
        )}
        <ServerAction
          destructive
          className="mb-2"
          actionData={{ code }}
          action={importAIGlosses}
        >
          {job ? "Import Again" : "Import"}
        </ServerAction>
      </>
    );
  }
}
