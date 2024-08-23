import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function RootLoadingPage() {
    return <div className="absolute w-full h-full flex items-center justify-center">
        <LoadingSpinner />        
    </div>
}
