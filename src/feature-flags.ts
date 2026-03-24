import { useMemo } from "react";
import { readCookie, setClientCookie } from "@/shared/cookies";

export type Feature = "ff-interlinear-pdf-export"; // string union of available flags

const FEATURE_FLAGS_COOKIE = "features";
const COOKIE_AGE = 365 * 24 * 60 * 60;

function readFeatureFlags(): string[] {
  const featureCookie = readCookie(FEATURE_FLAGS_COOKIE);
  if (!featureCookie) {
    return [];
  }

  return featureCookie
    .split(",")
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);
}

export function isFeatureEnabled(feature: Feature) {
  const featureList = readFeatureFlags();
  return featureList.includes(feature);
}

export function useFeatureFlag(feature: Feature) {
  return useMemo(() => isFeatureEnabled(feature), [feature]);
}

export function setFeatureFlag(feature: Feature, enabled: boolean) {
  const currentFeatureList = new Set(readFeatureFlags());

  if (enabled) {
    currentFeatureList.add(feature);
  } else {
    currentFeatureList.delete(feature);
  }

  setClientCookie(
    FEATURE_FLAGS_COOKIE,
    Array.from(currentFeatureList).join(","),
    {
      maxAge: COOKIE_AGE,
    },
  );
}
