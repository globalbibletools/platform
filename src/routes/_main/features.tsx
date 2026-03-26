import ViewTitle from "@/components/ViewTitle";
import { createFileRoute } from "@tanstack/react-router";
import FeatureSwitch from "./-components/FeatureSwitch";
import { withDocumentTitle } from "@/documentTitle";

export const Route = createFileRoute("/_main/features")({
  head: () => withDocumentTitle("Features"),
  component: FeaturesRoute,
});

function FeaturesRoute() {
  return (
    <div className="grow flex items-start justify-center">
      <div
        className="shrink p-6 m-4 w-96
        border border-gray-300 rounded shadow-md
        dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
      >
        <ViewTitle>Features</ViewTitle>
        <FeatureSwitch
          feature="ff-interlinear-pdf-export"
          label="Interlinear PDF Export"
        />
      </div>
    </div>
  );
}
