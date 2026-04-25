import { createFileRoute, Outlet } from "@tanstack/react-router";
import ReadingToolbar from "../components/ReadingToolbar";
import { getReadLayoutData } from "../serverFns/getReadLayoutData";

export const Route = createFileRoute("/_main/read/$code")({
  loader: ({ params }) => getReadLayoutData({ data: { code: params.code } }),
  component: ReadingLayout,
});

function ReadingLayout() {
  const { languages, progressByBookId } = Route.useLoaderData();

  return (
    <ReadingToolbar languages={languages} progressByBookId={progressByBookId}>
      <Outlet />
    </ReadingToolbar>
  );
}
