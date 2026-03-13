export type TrackingEvent = {
  id: string;
  type: "approved_gloss";
  createdAt: Date;
  languageId: string;
  userId: string;
  phraseId: number;
  method:
    | "USER_INPUT"
    | "GOOGLE_SUGGESTION"
    | "LLM_SUGGESTION"
    | "MACHINE_SUGGESTION";
};
