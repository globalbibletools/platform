import ViewTitle from "@/components/ViewTitle";
import ContributionsChart from "./ContributionsChart";
import reportingQueryService from "../ReportingQueryService";
import { userClient } from "@/modules/users/public/UserClient";

export interface UserReportsViewProps {
  params: { userId: string };
}

export default async function UserReportsView({
  params,
}: UserReportsViewProps) {
  const [user, contributions] = await Promise.all([
    userClient.findUserById(params.userId),
    reportingQueryService.findContributionsByUserId(params.userId),
  ]);

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-full">
        <ViewTitle className="mb-4">
          Reports for {user?.name ?? "Unknown User"}
        </ViewTitle>
        <section className="w-full mb-12">
          <h2 className="font-bold mb-2">Contributions</h2>
          <ContributionsChart data={contributions} />
        </section>
      </div>
    </div>
  );
}
