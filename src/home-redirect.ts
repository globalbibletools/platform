import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { verifySession } from "./session";

export default async function homeRedirect(): Promise<string> {
  const locale = await getLocale();

  const session = await verifySession();
  if (session) {
    return `/${locale}/dashboard`;
  }

  const cookieStore = cookies();
  const lastVisited = cookieStore.get("LAST_READ")?.value;

  if (lastVisited) {
    const [code, chapterId] = lastVisited.split(",");
    if (code && chapterId) {
      return `/${locale}/read/${code}/${chapterId}`;
    }
  }

  return `/${locale}/read/eng/01001`;
}
