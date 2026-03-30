import { resolvePermalink } from "@/modules/study/route-handlers/resolvePermalink";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/p/$")({
  beforeLoad({ location }) {
    resolvePermalink(location);
  },
});
