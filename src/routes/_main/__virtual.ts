import {
  defineVirtualSubtreeConfig,
  physical,
} from "@tanstack/virtual-file-routes";

export default defineVirtualSubtreeConfig([
  physical("/admin", "../../../ui/admin/routes"),
  physical("/translate", "../../../ui/translation/routes"),
]);
