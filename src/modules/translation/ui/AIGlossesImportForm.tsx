import { Icon } from "@/components/Icon";
import ServerAction from "@/components/ServerAction";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { importAIGlosses } from "../actions/importAIGlosses";
import { getAIGlossImportJobReadModel } from "../read-models/getAIGlossImportJobReadModel";
import { getAIGlossImportLanguagesReadModel } from "../read-models/getAIGlossImportLanguagesReadModel";
import JobStatusPoller from "@/shared/jobs/ui/JobStatusPoller";
import { JobStatus } from "@/shared/jobs/model";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { createParseMiddleware } from "@/parseMiddleware";
import * as z from "zod";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export const getAIGlossesImportFormData = createServerFn()
  .middleware([
    createPolicyMiddleware({
      policy,
      parseMiddleware: createParseMiddleware(requestSchema),
      selectLanguageCode: (data) => data.code,
    }),
  ])
  .handler(async ({ data }) => {
    const [job, availableLanguages] = await Promise.all([
      getAIGlossImportJobReadModel(data.code),
      getAIGlossImportLanguagesReadModel(),
    ]);

    const language = availableLanguages.find(
      (entry) => entry.code === data.code,
    );

    return { job, languageAvailable: !!language };
  });

export default function AIGlossesImportForm({ code }: { code: string }) {
  const getData = useServerFn(getAIGlossesImportFormData);
  const { data } = useSuspenseQuery({
    queryKey: ["ai-glosses-import-form", code],
    queryFn: () => getData({ data: { code } }),
  });

  const { job, languageAvailable } = data;

  if (
    job?.status === JobStatus.Pending ||
    job?.status === JobStatus.InProgress
  ) {
    return (
      <>
        <p className="mb-2">AI gloss import running</p>
        <JobStatusPoller jobId={job.id} />
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
                {new Date(job.updatedAt).toLocaleString()}
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
