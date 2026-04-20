import { createFileRoute, redirect } from "@tanstack/react-router";
import { readReadNavigationCookie } from "@/shared/navigationCookies";

export const Route = createFileRoute("/_main/read")({
  beforeLoad: ({ location }) => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length === 4) {
      return;
    }

    const cookieValue = readReadNavigationCookie();

    throw redirect({
      to: "/read/$code/$chapterId",
      params: {
        code: cookieValue?.code ?? "eng",
        chapterId: cookieValue?.chapterId ?? "01001",
      },
    });
  },
});
