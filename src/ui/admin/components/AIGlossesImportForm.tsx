import { Icon } from "@/components/Icon";
import { importAIGlosses } from "@/modules/translation/actions/importAIGlosses";
import { JobStatus } from "@/shared/jobs/model";
import { useSuspenseQuery } from "@tanstack/react-query";
import Button from "@/components/Button";
import { getAIGlossesImportFormData } from "@/ui/admin/serverFns/getAIGlossesImportFormData";
import bookKeys from "@/data/book-keys.json";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AIGlossesImportForm({ code }: { code: string }) {
  const { data, refetch } = useSuspenseQuery({
    queryKey: ["ai-glosses-import-form", code],
    queryFn: () => getAIGlossesImportFormData({ data: { code } }),
    refetchInterval: 15000,
  });

  const { job, languageAvailable } = data;
  const currentBook =
    typeof job?.bookId === "number" ? bookKeys[job.bookId - 1] : null;

  if (
    job?.status === JobStatus.Pending ||
    job?.status === JobStatus.InProgress
  ) {
    return (
      <>
        <p className="mb-2 text-sm">
          {currentBook ?
            `Importing AI glosses for ${currentBook}`
          : "Importing AI glosses"}
        </p>
        <LoadingSpinner className="w-fit" />
      </>
    );
  } else {
    if (!languageAvailable) {
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
                icon="triangle-exclamation"
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
                {new Date(job.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
        <Button
          destructive
          className="mb-2"
          onClick={async () => {
            await importAIGlosses({ data: { code } });
            refetch();
          }}
        >
          {job ? "Import Again" : "Import"}
        </Button>
      </>
    );
  }
}
