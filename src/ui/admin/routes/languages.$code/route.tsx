import { createFileRoute } from "@tanstack/react-router";
import { getAdminLanguageByCode } from "@/ui/admin/serverFns/getAdminLanguageByCode";

export const Route = createFileRoute("/_main/admin/languages/$code")({
  ssr: "data-only",
  loader: ({ params }) => {
    return getAdminLanguageByCode({ data: params });
  },
});
