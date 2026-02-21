import {
  fetchLandingPageData,
  LandingPage,
} from "@/modules/landing/ui/LandingRoute";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: () => fetchLandingPageData(),
});
