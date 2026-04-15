import { createFileRoute } from "@tanstack/react-router";
import { getTranslationLanguage } from "../serverFns/getTranslationLanguage";

export const Route = createFileRoute("/_main/translate/$code")({
  loader: ({ params }) =>
    getTranslationLanguage({ data: { code: params.code } }),
});
