import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Redirect(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
  const cookieStore = await cookies();
  const lastVisited = cookieStore.get("LAST_TRANSLATION")?.value;

  if (lastVisited) {
    const [_, verseId] = lastVisited.split(",");
    if (verseId) {
      redirect(`./${params.code}/${verseId}`);
    }
  }

  redirect("./eng/01001001");
}
