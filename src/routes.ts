import {
  rootRoute,
  route,
  index,
  layout,
  physical,
} from "@tanstack/virtual-file-routes";

export const routes = rootRoute("root.tsx", [
  index("modules/landing/ui/LandingRoute.tsx"),
]);
