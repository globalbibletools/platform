import { redirect, RedirectType } from "next/navigation";

export default function AdminRedirectPage() {
    redirect('./admin/languages', RedirectType.replace)
}
