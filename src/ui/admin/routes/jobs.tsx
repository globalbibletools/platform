import { format } from "date-fns";
import ViewTitle from "@/components/ViewTitle";
import ServerAction from "@/components/ServerAction";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import { queueJobAction } from "@/shared/jobs/queueJobAction";
import { JobStatus } from "@/shared/jobs/model";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";
import { getActiveJobs } from "@/ui/admin/serverFns/getActiveJobs";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/jobs")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  head: () => withDocumentTitle("Jobs | Admin"),
  component: AdminJobsView,
});

function AdminJobsView() {
  const {
    data: { exportJobs },
    refetch,
  } = useSuspenseQuery({
    queryKey: ["activeJobs"],
    queryFn: () => getActiveJobs(),
    refetchInterval: ({ state }) => {
      const hasInprogressJobs = state.data?.exportJobs.some(
        (job) =>
          job.status !== JobStatus.Complete && job.status !== JobStatus.Failed,
      );
      return hasInprogressJobs ? 3000 : false;
    },
  });

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <ViewTitle>Jobs</ViewTitle>
        <ServerAction
          actionData={{ type: "export_analytics" }}
          action={queueJobAction}
        >
          Export Analytics
        </ServerAction>
        <ServerAction
          actionData={{
            type: "update_book_completion_progress",
            payload: { allLanguages: true },
          }}
          action={queueJobAction}
        >
          Recompute Language Progress
        </ServerAction>
        <ServerAction
          actionData={{
            type: "sync_ai_gloss_languages",
          }}
          action={queueJobAction}
        >
          Sync AI Gloss Languages
        </ServerAction>

        <div className="mt-8 max-w-5xl">
          <h2 className="text-xl font-bold mb-3">GitHub Export</h2>

          <ServerAction
            actionData={{ type: "export_glosses" }}
            action={queueJobAction}
            onComplete={refetch}
          >
            Trigger Manual Export
          </ServerAction>

          {exportJobs.length > 0 && (
            <>
              <div className="flex gap-2 items-baseline">
                <h3 className="mt-4 text-lg font-bold">Last Run:</h3>
                <span>
                  {format(exportJobs[0].createdAt, "MMM dd, yyy hh:mm aaa")}
                </span>
              </div>

              {exportJobs.length > 0 && (
                <List className="w-full">
                  <ListHeader>
                    <ListHeaderCell className="py-2 ps-2">Job</ListHeaderCell>
                    <ListHeaderCell className="py-2">Status</ListHeaderCell>
                  </ListHeader>
                  <ListBody>
                    {exportJobs.map((job) => (
                      <ListRow key={job.id}>
                        <ListCell className="py-2 pe-4 whitespace-nowrap">
                          <div>
                            {(() => {
                              switch (job.type) {
                                case "export_glosses_child":
                                  return `Export ${job.languages.join(", ")}`;
                                case "export_glosses":
                                  return `Setup`;
                                case "export_glosses_finalize":
                                  return `Finalize`;
                                default:
                                  throw new Error(
                                    `invalid job type: ${job.type}`,
                                  );
                              }
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">{job.id}</div>
                        </ListCell>
                        <ListCell className="pt-1 pb-2 pe-4 whitespace-nowrap">
                          <div
                            className={`inline-block px-2 py-0.5 mb-1 rounded-sm text-xs font-bold uppercase ${getStatusClassName(job.status)}`}
                          >
                            {job.status.replace("-", " ")}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format(job.updatedAt, "MMM dd, yyy hh:mm aaa")}
                          </div>
                        </ListCell>
                      </ListRow>
                    ))}
                  </ListBody>
                </List>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusClassName(status: JobStatus): string {
  switch (status) {
    case JobStatus.Complete:
      return "bg-green-200 text-gray-900";
    case JobStatus.Failed:
      return "bg-red-300 text-gray-900";
    case JobStatus.InProgress:
      return "bg-brown-100 text-gray-900";
    case JobStatus.Pending:
    default:
      return "bg-gray-200 text-gray-900";
  }
}
