import { query } from "@/db";
import ReadingToolbar from "@/modules/study/ui/ReadingToolbar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_main/read/$code")({
  loader: () => loaderFn(),
  component: ReadingLayout,
});

const loaderFn = createServerFn().handler(async () => {
  const languages = await fetchLanguages();

  return { languages };
});

function ReadingLayout() {
  const { languages } = Route.useLoaderData();

  return (
    <ReadingToolbar languages={languages}>
      <Outlet />
    </ReadingToolbar>
  );
}

interface Language {
  code: string;
  englishName: string;
  localName: string;
}

// TODO: cache this, it will only change when languages are added or reconfigured
async function fetchLanguages(): Promise<Language[]> {
  const result = await query<Language>(
    `SELECT code, english_name AS "englishName", local_name AS "localName" FROM language ORDER BY local_name`,
    [],
  );
  return result.rows;
}
