import { createFileRoute, redirect } from "@tanstack/react-router";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ authenticated: true });

export const Route = createFileRoute("/_main/translate")({
  ssr: "data-only",
  beforeLoad: async ({ context, location }) => {
    routerGuard({ context: context.auth, policy });

    const pathParts = location.pathname.split("/");
    if (pathParts.length > 2) {
      return;
    }

    const [, , code = "eng", verseId = "01001001"] = pathParts;
    throw redirect({
      to: "/translate/$code/$verseId",
      params: { code, verseId },
    });
  },
});
