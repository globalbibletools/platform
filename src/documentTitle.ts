import { getTranslator } from "@/shared/i18n/messages";

interface HeadLike {
  meta?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export async function withDocumentTitle(
  pageTitle: string,
  rest: HeadLike = {},
) {
  const t = await getTranslator("RootLayout");

  const title = `${pageTitle} | ${t("app_name")}`;
  const restMeta = rest.meta ?? [];
  const meta = [...restMeta.filter((item) => !("title" in item)), { title }];

  return {
    ...rest,
    meta,
  };
}
