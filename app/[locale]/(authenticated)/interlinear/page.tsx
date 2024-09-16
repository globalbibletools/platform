import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Redirect() {
    const cookieStore = cookies()
    const lastVisited = cookieStore.get('LAST_TRANSLATION')?.value
    
    if (lastVisited) {
        const [code, verseId] = lastVisited.split(',')
        if (code && verseId) {
            redirect(`./interlinear/${code}/${verseId}`)
        }
    }

    redirect('./interlinear/eng/01001001')
}
