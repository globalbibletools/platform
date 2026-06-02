import {
  defineVirtualSubtreeConfig,
  physical,
} from "@tanstack/virtual-file-routes";

export default defineVirtualSubtreeConfig([
  physical("../../../ui/downloads/routes"),
]);
