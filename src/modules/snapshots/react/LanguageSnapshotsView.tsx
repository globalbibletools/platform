import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import ServerAction from "@/components/ServerAction";
import { createLanguageSnapshotAction } from "../actions/createLanguageSnapshot";

interface LanguageSettingsPageProps {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;

  return {
    title: `Snapshots | ${title?.absolute}`,
  };
}

export default async function LanguageSettingsPage({
  params,
}: LanguageSettingsPageProps) {
  function createSnapshot() {}

  return (
    <div className="px-8 py-6 w-fit overflow-y-auto h-full">
      <ViewTitle>Snapshots</ViewTitle>
      <section>
        <ServerAction
          action={createLanguageSnapshotAction}
          actionData={{ code: params.code }}
        >
          Take New Snapshot
        </ServerAction>
      </section>
    </div>
  );
}
