export default function ContributionBar({
  contribution,
  max,
}: {
  contribution: number;
  max: number;
}) {
  const percent = ((contribution / max) * 100).toFixed(2);

  return (
    <div className="h-3 w-full overflow-hidden">
      <div
        className="h-full bg-linear-to-r from-green-300 to-blue-700 dark:from-green-500 dark:to-blue-800"
        style={{
          maskImage: `linear-gradient(to right, black ${percent}%, transparent ${percent}%)`,
        }}
      />
    </div>
  );
}
