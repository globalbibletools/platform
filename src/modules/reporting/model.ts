export type TrackingEvent =
  | {
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
    }
  | {
      id: string;
      type: "gloss_changed";
      createdAt: Date;
      languageId: string;
      userId: string;
      phraseId: number;
      wordIds: string[];
      action: "approved" | "revoked" | "edited_approved" | "edited_unapproved";
      approvalMethod?:
        | "USER_INPUT"
        | "GOOGLE_SUGGESTION"
        | "LLM_SUGGESTION"
        | "MACHINE_SUGGESTION"
        | null;
    };
