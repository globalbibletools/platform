import { createFileRoute } from "@tanstack/react-router";
import { getAdminLanguageByCode } from "@/ui/admin/serverFns/getAdminLanguageByCode";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/languages/$code")({
  ssr: "data-only",
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: ({ params }) => {
    return getAdminLanguageByCode({ data: params });
  },
});
