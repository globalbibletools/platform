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
import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { removeLanguageMember } from "../actions/removeLanguageMember";
import ServerAction from "@/components/ServerAction";
import { inviteUserAction } from "@/modules/users";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import { notFound } from "next/navigation";
import { getLanguageMembersReadModel } from "../read-models/getLanguageMembersReadModel";

interface LanguageUsersPageProps {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageUsersPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageUsersPage({
  params,
}: LanguageUsersPageProps) {
  const t = await getTranslations("LanguageUsersPage");

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  const users = await getLanguageMembersReadModel(params.code);

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="flex-grow" />
          <Button href="./users/invite" variant="primary">
            <Icon icon="plus" className="me-1" />
            {t("links.invite_user")}
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.name")}
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {users.map((user) => (
              <ListRow key={user.id}>
                <ListCell header className="pe-4 py-2">
                  <div className="">{user.name}</div>
                  <div className="font-normal text-sm">{user.email}</div>
                </ListCell>
                <ListCell className="py-2">
                  {user.invite && (
                    <ServerAction
                      variant="tertiary"
                      className="ms-4"
                      actionData={{ email: user.email }}
                      action={inviteUserAction}
                    >
                      {t("links.resend_invite")}
                    </ServerAction>
                  )}
                  <ServerAction
                    variant="tertiary"
                    className="text-red-700 ms-2 -me-2"
                    destructive
                    actionData={{
                      userId: user.id,
                      code: params.code,
                    }}
                    action={removeLanguageMember}
                  >
                    <Icon icon="xmark" />
                    <span className="sr-only">{t("links.remove")}</span>
                  </ServerAction>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
      </div>
    </div>
  );
}
