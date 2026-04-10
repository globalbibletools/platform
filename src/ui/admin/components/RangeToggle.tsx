import { Radio, RadioGroup } from "@headlessui/react";
import { type ActivityChartRange } from "@/ui/admin/components/ActivityChart";

export default function RangeToggle({
  range,
  onChange,
}: {
  range: ActivityChartRange;
  onChange: (next: ActivityChartRange) => void;
}) {
  return (
    <RadioGroup
      value={range}
      onChange={onChange}
      aria-label="Activity range"
      className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-600"
    >
      <Radio
        value="30d"
        className="rounded px-2 py-1 text-xs font-bold data-checked:bg-blue-800 data-checked:text-white text-gray-600 dark:text-gray-300"
      >
        30d
      </Radio>
      <Radio
        value="6m"
        className="rounded px-2 py-1 text-xs font-bold data-checked:bg-blue-800 data-checked:text-white text-gray-600 dark:text-gray-300"
      >
        6m
      </Radio>
    </RadioGroup>
  );
}
