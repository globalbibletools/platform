import { redirect, RedirectType } from "next/navigation";

export default function () {
    redirect('./admin/languages', RedirectType.replace)
}
