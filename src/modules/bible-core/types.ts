export const Testament = {
  OldTestament: "OT",
  NewTestament: "NT",
} as const;
export type Testament = (typeof Testament)[keyof typeof Testament];
