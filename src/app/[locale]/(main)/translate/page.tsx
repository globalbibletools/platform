import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Redirect() {
  const cookieStore = await cookies();
  const lastVisited = cookieStore.get("LAST_TRANSLATION")?.value;

  if (lastVisited) {
    const [code, verseId] = lastVisited.split(",");
    if (code && verseId) {
      redirect(`./translate/${code}/${verseId}`);
    }
  }

  redirect("./translate/eng/01001001");
}
