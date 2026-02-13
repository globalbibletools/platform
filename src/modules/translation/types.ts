export enum GlossStateRaw {
  Approved = "APPROVED",
  Unapproved = "UNAPPROVED",
}
export enum GlossSourceRaw {
  User = "USER",
  Import = "IMPORT",
}

export const GlossApprovalMethodRaw = {
  UserInput: "USER_INPUT",
  GoogleSuggestion: "GOOGLE_SUGGESTION",
  LLMSuggestion: "LLM_SUGGESTION",
  MachineSuggestion: "MACHINE_SUGGESTION",
} as const;
export type GlossApprovalMethodRaw =
  (typeof GlossApprovalMethodRaw)[keyof typeof GlossApprovalMethodRaw];
