import ViewTitle from "@/components/ViewTitle";
import ContributionsChart from "./ContributionsChart";

export interface UserReportsViewProps {
  params: { userId: string };
}

export default function UserReportsView({ params }: UserReportsViewProps) {
  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-full">
        <ViewTitle className="mb-4">Reports</ViewTitle>
        <section className="w-full mb-12">
          <h2 className="font-bold mb-2">Contributions</h2>
          <ContributionsChart />
        </section>
      </div>
    </div>
  );
}
