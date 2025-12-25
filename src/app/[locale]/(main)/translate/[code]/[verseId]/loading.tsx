import LoadingSpinner from "@/components/LoadingSpinner";

export default function RootLoadingPage() {
  return (
    <div className="flex-grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
