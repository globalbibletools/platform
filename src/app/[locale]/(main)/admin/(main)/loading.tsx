import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminLoadingPage() {
  return (
    <div className="absolute w-full h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
