import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "@/modules/translation/actions/getTranslationVerseData";
import ClientTranslationView from "@/modules/translation/ui/ClientTranslationView";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/translate/$code/$verseId")({
  loader: ({ params }) =>
    getTranslationVerseData({
      data: { code: params.code, verseId: params.verseId },
    }),
  pendingComponent: TranslationRoutePending,
  component: TranslationRoute,
});

function TranslationRoutePending() {
  return (
    <div className="grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function TranslationRoute() {
  const { verseId } = Route.useParams();
  const data = Route.useLoaderData();

  if (!data.language) {
    throw notFound();
  }

  return (
    <ClientTranslationView
      verseId={verseId}
      words={data.words}
      phrases={data.phrases}
      language={data.language}
    />
  );
}
