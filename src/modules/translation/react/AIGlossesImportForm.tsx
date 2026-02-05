import LoadingSpinner from "@/components/LoadingSpinner";
import Poller from "./Poller";
import { Icon } from "@/components/Icon";
import { machineGlossGenerationService } from "../data-access/machineGlossGenerationService";
import ServerAction from "@/components/ServerAction";
import { format } from "date-fns";
import { importAIGlosses } from "../actions/importAIGlosses";

export default async function AIGlossesImportForm({ code }: { code: string }) {
  const job = null as { succeeded?: boolean; completedOn?: Date } | null;

  if (job && typeof job.succeeded !== "boolean") {
    return (
      <>
        <p className="mb-2">AI gloss import running</p>
        <LoadingSpinner className="w-fit" />
        <Poller code={code} />
      </>
    );
  } else {
    const availableLanguages =
      await machineGlossGenerationService.getAvailableLanguages();
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
        {typeof job?.succeeded === "boolean" && (
          <div className="mb-4 flex gap-2 items-top">
            {job.succeeded ?
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
                {job.succeeded ?
                  "Imported AI glosses successfully!"
                : "Error importing AI glosses"}
              </p>
              <p className="italic text-sm">
                {job.completedOn && format(job.completedOn, "MMM dd, yyy")}
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
          {typeof job?.succeeded === "boolean" ? "Import Again" : "Import"}
        </ServerAction>
      </>
    );
  }
}
