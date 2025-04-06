import { Metadata, ResolvingMetadata } from "next";
import ViewTitle from "@/components/ViewTitle";
import ServerAction from "@/components/ServerAction";
import { queueJobAction } from "./queueJobAction";
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;

  return {
    title: `Jobs | ${title?.absolute}`,
  };
}

export default async function AdminJobsView() {
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
      </div>
    </div>
  );
}
