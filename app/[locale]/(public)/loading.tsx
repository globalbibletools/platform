import LoadingSpinner from "@/app/components/LoadingSpinner";
import ModalView from "@/app/components/ModalView";

export default function ModalViewLoadingPage() {
    return <ModalView className="max-w-[480px] w-full">
        <div className="flex items-center justify-center">
            <LoadingSpinner />        
        </div>
    </ModalView>
}
