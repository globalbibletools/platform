import { Outlet, createFileRoute } from "@tanstack/react-router";
import { getTranslationLayoutData } from "@/modules/translation/actions/getTranslationLayoutData";
import TranslationToolbar from "@/modules/translation/ui/TranslationToolbar";
import { TranslationClientStateProvider } from "@/modules/translation/ui/TranslationClientState";

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
