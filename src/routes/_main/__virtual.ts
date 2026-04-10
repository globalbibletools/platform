import { adminRoutes } from "@/ui/admin/virtual";
import { translationRoutes } from "@/ui/translation/virtual";
import { defineVirtualSubtreeConfig } from "@tanstack/virtual-file-routes";

export default defineVirtualSubtreeConfig([
  ...translationRoutes,
  ...adminRoutes,
]);
