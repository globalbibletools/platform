import * as z from "zod";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import Pagination from "@/components/Pagination";
import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { searchLanguagesReadModel } from "@/modules/languages/read-models/searchLanguagesReadModel";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { withDocumentTitle } from "@/documentTitle";

const LIMIT = 20;
const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

const schema = z.object({
  page: z.coerce.number().int().default(1),
});

export const Route = createFileRoute("/_main/admin/_main/languages/")({
  validateSearch: schema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: ({ deps }) => loaderFn({ data: deps }),
  head: () => withDocumentTitle("Languages | Admin"),
  component: AdminLanguagesRoute,
});

const loaderFn = createServerFn()
  .inputValidator(schema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    if (data.page <= 0) {
      throw redirect({ to: "/admin/languages", search: { page: 1 } });
    }

    const { page: languages, total } = await searchLanguagesReadModel({
      page: data.page - 1,
      limit: LIMIT,
    });

    if (languages.length === 0 && data.page !== 1) {
      throw redirect({ to: "/admin/languages", search: { page: 1 } });
    }

    return { languages, total };
  });

function AdminLanguagesRoute() {
  const { languages, total } = Route.useLoaderData();

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>Languages</ViewTitle>
          <div className="grow" />
          <Button variant="primary" to="/admin/languages/new">
            <Icon icon="plus" className="me-1" />
            Add Language
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[240px]">Language</ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              OT Progress
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              NT Progress
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {languages.map((language) => (
              <ListRow key={language.code}>
                <ListCell header>
                  <Button
                    to="/admin/languages/$code"
                    variant="tertiary"
                    params={{ code: language.code }}
                  >
                    {language.englishName}
                  </Button>
                  <span className="text-sm ml-1 font-normal">
                    {language.code}
                  </span>
                </ListCell>
                <ListCell>{(100 * language.otProgress).toFixed(2)}%</ListCell>
                <ListCell>{(100 * language.ntProgress).toFixed(2)}%</ListCell>
                <ListCell>
                  <Button
                    variant="tertiary"
                    to="/admin/languages/$code/settings"
                    params={{ code: language.code }}
                  >
                    <Icon icon="gear" className="me-1" />
                    Settings
                  </Button>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <Pagination className="mt-6" limit={LIMIT} total={total} />
      </div>
    </div>
  );
}
