import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import ServerAction from "@/components/ServerAction";
import { createLanguageSnapshotAction } from "../actions/createLanguageSnapshot";
import { notFound } from "next/navigation";
import { snapshotQueryService } from "../data-access/snapshotQueryService";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
  ListRowAction,
} from "@/components/List";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Button from "@/components/Button";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;

  return {
    title: `Snapshots | ${title?.absolute}`,
  };
}

const PAGE_SIZE = 10;

export default async function LanguageSettingsPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { page?: string };
}) {
  const messages = await getMessages();

  let page = searchParams.page ? parseInt(searchParams.page) : 1;
  if (isNaN(page) || page <= 0) {
    page = 1;
  }

  const language = await languageQueryService.findByCode(params.code);
  if (!language) {
    notFound();
  }

  const snapshotPage = await snapshotQueryService.findSnapshotsForLanguage({
    languageId: language.id,
    limit: PAGE_SIZE,
    page,
  });

  return (
    <NextIntlClientProvider
      messages={{
        Pagination: messages.Pagination,
      }}
    >
      <div className="px-8 py-6 w-fit overflow-y-auto h-full">
        <ViewTitle>Snapshots</ViewTitle>
        <div className="mb-8">
          <ServerAction
            action={createLanguageSnapshotAction}
            actionData={{ code: params.code }}
          >
            Take New Snapshot
          </ServerAction>
        </div>
        <List className="mb-4">
          <ListHeader>
            <ListHeaderCell>Timestamp</ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {snapshotPage.page.map((snapshot) => (
              <ListRow key={snapshot.id}>
                <ListCell>
                  {format(snapshot.timestamp, "YYY MMMM, dd HH:mm:ss")} UTC
                </ListCell>
                <ListCell className="ps-4">
                  <Button variant="link" disabled>
                    Restore (coming soon)
                  </Button>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <Pagination limit={PAGE_SIZE} total={snapshotPage.total} />
      </div>
    </NextIntlClientProvider>
  );
}
