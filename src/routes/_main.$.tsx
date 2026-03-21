import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/$")({
  beforeLoad: () => {
    throw notFound();
  },
});
