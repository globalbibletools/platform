import { redirect, RedirectType } from "next/navigation";

export default async function LanguageRedirectPage(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
  redirect(`./${params.code}/settings`, RedirectType.replace);
}
