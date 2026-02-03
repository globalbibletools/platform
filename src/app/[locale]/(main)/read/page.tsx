import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Redirect() {
  const cookieStore = await cookies();
  const lastVisited = cookieStore.get("LAST_READ")?.value;

  if (lastVisited) {
    const [code, chapterId] = lastVisited.split(",");
    if (code && chapterId) {
      redirect(`./read/${code}/${chapterId}`);
    }
  }

  redirect("./read/eng/01001");
}
