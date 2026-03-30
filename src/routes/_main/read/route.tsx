import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/read")({
  beforeLoad: ({ location }) => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length === 4) return;

    // TODO: save last visited cookie and return when redirecting
    const [, , code = "eng", chapterId = "01001"] = pathParts;
    throw redirect({
      to: "/read/$code/$chapterId",
      params: { code, chapterId },
    });
  },
});
