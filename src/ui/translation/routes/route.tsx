import { createFileRoute, redirect } from "@tanstack/react-router";
import Policy from "@/modules/access/Policy";
import { routerGuard } from "@/modules/access/routerGuard";
import { readTranslateNavigationCookie } from "@/shared/navigationCookies";

const policy = new Policy({ authenticated: true });

export const Route = createFileRoute("/_main/translate")({
  ssr: "data-only",
  beforeLoad: ({ context, location }) => {
    routerGuard({ context: context.auth, policy });

    const pathParts = location.pathname.split("/");
    if (pathParts.length > 2) {
      return;
    }

    const cookieValue = readTranslateNavigationCookie();

    throw redirect({
      to: "/translate/$code/$verseId",
      params: {
        code: cookieValue?.code ?? "eng",
        verseId: cookieValue?.verseId ?? "01001001",
      },
    });
  },
});
