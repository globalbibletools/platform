"use client";

import { Feature, useFeatureFlag } from "@/feature-flags";
import { ReactNode } from "react";

export default function FeatureFlagged({
  feature,
  enabledChildren,
  disabledChildren,
}: {
  feature: Feature;
  enabledChildren?: ReactNode;
  disabledChildren?: ReactNode;
}) {
  const flag = useFeatureFlag(feature);

  if (flag) {
    return enabledChildren;
  } else {
    return disabledChildren;
  }
}
