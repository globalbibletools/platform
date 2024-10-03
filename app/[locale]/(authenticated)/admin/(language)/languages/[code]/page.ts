import { redirect, RedirectType } from "next/navigation";

export default function ({ params }: { params: { code: string } }) {
    redirect(`./${params.code}/settings`, RedirectType.replace)
}
