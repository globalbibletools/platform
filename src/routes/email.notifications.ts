import { createFileRoute } from "@tanstack/react-router";
import postEmailNotification from "@/modules/users/route-handlers/emailNotifications";

export const Route = createFileRoute("/email/notifications")({
  server: {
    handlers: {
      POST: ({ request }) => postEmailNotification(request),
    },
  },
});
