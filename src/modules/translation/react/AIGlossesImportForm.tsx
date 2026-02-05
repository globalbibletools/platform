import LoadingSpinner from "@/components/LoadingSpinner";
import Poller from "./Poller";
import { Icon } from "@/components/Icon";
import ServerAction from "@/components/ServerAction";
import { format } from "date-fns";
import { importAIGlosses } from "../actions/importAIGlosses";
import { getAIGlossesImportJobReadModel } from "../read-models/getAIGlossesImportJobReadModel";
import { JobStatus } from "@/shared/jobs/model";
import { getAvailableLanguagesForAIGlossImportReadModel } from "../read-models/getAvailableLanguagesForAIGlossImportReadModel";

export default async function AIGlossesImportForm({ code }: { code: string }) {
  const job = await getAIGlossesImportJobReadModel(code);

  if (
    job?.status === JobStatus.Pending ||
    job?.status === JobStatus.InProgress
  ) {
    return (
      <>
        <p className="mb-2">AI gloss import running</p>
        <LoadingSpinner className="w-fit" />
        <Poller code={code} />
      </>
    );
  } else {
    const availableLanguages =
      await getAvailableLanguagesForAIGlossImportReadModel();
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
                {format(job.updatedAt, "MMM dd, yyy pp")} UTC
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
