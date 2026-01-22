import LoadingSpinner from "@/components/LoadingSpinner";
import ModalView from "@/components/ModalView";

export default function ModalViewLoadingPage() {
  return (
    <ModalView className="max-w-[480px] w-full">
      <div className="flex items-center justify-center">
        <LoadingSpinner />
      </div>
    </ModalView>
  );
}
