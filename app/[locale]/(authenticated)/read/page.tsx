import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Redirect() {
    const cookieStore = cookies()
    const lastVisited = cookieStore.get('LAST_READ')?.value
    
    if (lastVisited) {
        const [code, chapterId] = lastVisited.split(',')
        if (code && chapterId) {
            redirect(`./interlinear/${code}/${chapterId}`)
        }
    }

    redirect('./read/eng/01001')
}
