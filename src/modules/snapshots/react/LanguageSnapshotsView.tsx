import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import ServerAction from "@/components/ServerAction";
import { createLanguageSnapshotAction } from "../actions/createLanguageSnapshot";
import { notFound } from "next/navigation";
import { snapshotQueryService } from "../data-access/snapshotQueryService";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import LoadingSpinner from "@/components/LoadingSpinner";
import SnapshotJobStatusPoller from "./SnapshotJobStatusPoller";
import { restoreLanguageSnapshotAction } from "../actions/restoreLanguageSnapshot";
import { Icon } from "@/components/Icon";
import { SNAPSHOT_JOB_TYPES } from "../jobs/jobTypes";

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

  const language = await getLanguageByCodeReadModel(params.code);
  if (!language) {
    notFound();
  }

  const [pendingJob, snapshotPage] = await Promise.all([
    snapshotQueryService.findPendingSnapshotJobForLanguage({
      languageId: language.id,
    }),
    snapshotQueryService.findSnapshotsForLanguage({
      languageId: language.id,
      limit: PAGE_SIZE,
      page,
    }),
  ]);

  return (
    <NextIntlClientProvider
      messages={{
        Pagination: messages.Pagination,
        ConfirmModal: messages.ConfirmModal,
      }}
    >
      <div className="px-8 py-6 w-fit overflow-y-auto h-full">
        <ViewTitle>Snapshots</ViewTitle>
        <div className="mb-8">
          {pendingJob ?
            <div className="flex gap-4">
              <LoadingSpinner />
              {pendingJob.type === SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT ?
                "Creating new snapshot..."
              : pendingJob.type === SNAPSHOT_JOB_TYPES.RESTORE_SNAPSHOT ?
                "Restoring snapshot..."
              : "Unknown snapshot action in progress"}
              <SnapshotJobStatusPoller code={params.code} />
            </div>
          : <ServerAction
              action={createLanguageSnapshotAction}
              actionData={{ code: params.code }}
            >
              Create New Snapshot
            </ServerAction>
          }
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
                  <ServerAction
                    variant="link"
                    destructive
                    action={restoreLanguageSnapshotAction}
                    actionData={{ code: params.code, snapshotId: snapshot.id }}
                    confirm="Are you sure you want to restore this snapshot?"
                    disabled={!!pendingJob}
                  >
                    <Icon icon="arrows-rotate" className="me-1" />
                    Restore
                  </ServerAction>
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
