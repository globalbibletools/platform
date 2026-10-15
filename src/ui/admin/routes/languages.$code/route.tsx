import { createFileRoute } from "@tanstack/react-router";
import { getAdminLanguageByCode } from "@/ui/admin/serverFns/getAdminLanguageByCode";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  // We have to permit language members access here for the settings page.
  // Nested routes need to lock down to just admins.
  languageMember: true,
});

export const Route = createFileRoute("/_main/admin/languages/$code")({
  ssr: "data-only",
  beforeLoad: ({ context, params }) => {
    routerGuard({ context: context.auth, policy, languageCode: params.code });
  },
  loader: ({ params }) => {
    return getAdminLanguageByCode({ data: params });
  },
});
