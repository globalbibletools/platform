import { Outlet, createFileRoute } from "@tanstack/react-router";
import { getTranslationLayoutData } from "../serverFns/getTranslationLayoutData";
import TranslationToolbar from "../components/TranslationToolbar";
import { TranslationClientStateProvider } from "../components/TranslationClientState";

export const Route = createFileRoute("/_main/translate/$code")({
  loader: ({ params }) =>
    getTranslationLayoutData({ data: { code: params.code } }),
  component: TranslationLayoutRoute,
});

function TranslationLayoutRoute() {
  const { languages, currentLanguage, userRoles } = Route.useLoaderData();

  return (
    <TranslationClientStateProvider>
      <TranslationToolbar
        languages={languages}
        currentLanguage={currentLanguage}
        userRoles={userRoles}
      />
      <Outlet />
    </TranslationClientStateProvider>
  );
}
