import ViewTitle from "@/components/ViewTitle";
import ServerAction from "@/components/ServerAction";
import { queueJobAction } from "@/shared/jobs/queueJobAction";
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";
import { createFileRoute } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";

export const Route = createFileRoute("/_main/admin/_main/jobs")({
  head: () => withDocumentTitle("Jobs | Admin"),
  component: AdminJobsView,
});

function AdminJobsView() {
  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <ViewTitle>Jobs</ViewTitle>
        <ServerAction
          actionData={{ type: REPORTING_JOB_TYPES.EXPORT_ANALYTICS }}
          action={queueJobAction}
        >
          Export Analytics
        </ServerAction>
        <ServerAction
          actionData={{
            type: REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS,
            payload: { allLanguages: true },
          }}
          action={queueJobAction}
        >
          Recompute Language Progress
        </ServerAction>
      </div>
    </div>
  );
}
