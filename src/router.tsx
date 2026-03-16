import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { deLocalizeUrl, localizeUrl } from "./shared/i18n/shared";

export function getRouter() {
  const router = createRouter({
    context: {
      auth: {
        systemRoles: [],
        languages: [],
      },
    },
    routeTree,
    scrollRestoration: true,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  });

  return router;
}
