export default function ProgressBar({ progress }: { progress: number }) {
  const percent = (progress * 100).toFixed(2);

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full rounded-full bg-linear-to-r from-green-300 to-blue-700 dark:from-green-500 dark:to-blue-800"
        style={{
          maskImage: `linear-gradient(to right, black ${percent}%, transparent ${percent}%)`,
        }}
      />
    </div>
  );
}
