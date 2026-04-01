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
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";
import { EXPORT_JOB_TYPES } from "@/modules/export/jobs/jobTypes";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getDb } from "@/db";
import { JobStatus } from "@/shared/jobs/model";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";
import { sql } from "kysely";
import { jsonBuildObject } from "kysely/helpers/postgres";

export const Route = createFileRoute("/_main/admin/_main/jobs")({
  head: () => withDocumentTitle("Jobs | Admin"),
  component: AdminJobsView,
});

const githubExportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

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

function AdminJobsView() {
  const {
    data: { exportJobs },
    refetch,
  } = useSuspenseQuery({
    queryKey: ["activeJobs"],
    queryFn: () => getActiveJobsReadModel(),
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

        <div className="mt-8 max-w-5xl">
          <h2 className="text-xl font-bold mb-3">GitHub Export</h2>

          <ServerAction
            actionData={{ type: EXPORT_JOB_TYPES.EXPORT_GLOSSES }}
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
                                case EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD:
                                  return `Export ${job.language.englishName}`;
                                case EXPORT_JOB_TYPES.EXPORT_GLOSSES:
                                  return `Setup`;
                                case EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE:
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

const getActiveJobsReadModel = createServerFn()
  .middleware([
    createPolicyMiddleware({
      policy: githubExportPolicy,
    }),
  ])
  .handler(async () => {
    const exportJobs = await getDb()
      .with("export_job", (db) =>
        db
          .selectFrom("job")
          .where("type", "=", EXPORT_JOB_TYPES.EXPORT_GLOSSES)
          .orderBy("created_at", "desc")
          .select(["id"])
          .limit(1),
      )
      .selectFrom("job")
      .leftJoin("language", (jb) =>
        jb.onRef(
          (eb) => sql<string>`${eb.ref("job.payload")}->>'languageCode'`,
          "=",
          "language.code",
        ),
      )
      .where((eb) =>
        eb.or([
          eb(
            "job.parent_job_id",
            "=",
            eb.selectFrom("export_job").select("id"),
          ),
          eb("job.id", "=", eb.selectFrom("export_job").select("id")),
        ]),
      )
      .orderBy("created_at")
      .select([
        "job.id",
        "job.type",
        "job.status",
        "job.updated_at as updatedAt",
        "job.created_at as createdAt",
        (eb) =>
          jsonBuildObject({
            id: eb.ref("language.id"),
            code: eb.ref("language.code"),
            englishName: eb.ref("language.english_name"),
          }).as("language"),
      ])
      .execute();

    return { exportJobs };
  });
