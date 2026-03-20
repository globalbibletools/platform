import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import BookProgressList from "@/modules/languages/ui/BookProgressList";
import { getLanguageBookProgressReadModel } from "@/modules/reporting";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const requestSchema = z.object({ code: z.string() });

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const Route = createFileRoute(
  "/_main/admin/languages/$code/dashboard" as any,
)({
  loader: ({ params }) => loaderFn({ data: params }),
  component: LanguageDashboardRoute,
});

const loaderFn = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    const books = await getLanguageBookProgressReadModel(language.id);
    return { books };
  });

function LanguageDashboardRoute() {
  const { books } = Route.useLoaderData();

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>Dashboard</ViewTitle>
        </div>
        {books.length === 0 ?
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No books are currently in progress.
          </p>
        : <BookProgressList books={books} />}
      </div>
    </div>
  );
}
