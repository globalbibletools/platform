import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Redirect({ params }: { params: { code: string } }) {
  const cookieStore = cookies();
  const lastVisited = cookieStore.get("LAST_READ")?.value;

  if (lastVisited) {
    const [_, verseId] = lastVisited.split(",");
    if (verseId) {
      redirect(`./${params.code}/${verseId}`);
    }
  }

  redirect("./eng/01001");
}
