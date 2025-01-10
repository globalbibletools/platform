import { useLayoutEffect, useMemo, useState } from "react";

export type Feature = "llm-prediction";

export const features: Feature[] = ["llm-prediction"];

export function isFeatureEnabled(feature: Feature) {
  const featureList = window.localStorage.getItem("features")?.split(",") ?? [];
  return featureList.includes(feature);
}

export function useFeatureFlag(feature: Feature) {
  // Can't use useMemo because window isn't available in SSR.
  const [isEnabled, setEnabled] = useState(false);
  useLayoutEffect(() => setEnabled(isFeatureEnabled(feature)), [feature]);

  return isEnabled;
}

export function setFeatureFlag(feature: Feature, enabled: boolean) {
  let featureList = window.localStorage.getItem("features")?.split(",") ?? [];

  if (enabled) {
    featureList.push(feature);
  } else {
    featureList = featureList.filter((f) => f !== feature);
  }

  window.localStorage.setItem("features", featureList.join(","));
}
