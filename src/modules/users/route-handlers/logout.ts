import { clearSession } from "@/session";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function handleLogout(req: Request) {
  await clearSession();
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
