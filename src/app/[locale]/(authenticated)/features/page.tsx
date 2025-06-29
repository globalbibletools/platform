import ViewTitle from "@/components/ViewTitle";
import FeatureSwitch from "./FeatureSwitch";

export default function FeaturesPage() {
  return (
    <div className="flex items-start justify-center absolute w-full h-full">
      <div
        className="flex-shrink p-6 mx-4 mt-4 w-96
        border border-gray-300 rounded shadow-md
        dark:bg-gray-700 dark:border-gray-600 dark:shadow-none"
      >
        <ViewTitle>Features</ViewTitle>
      </div>
    </div>
  );
}
