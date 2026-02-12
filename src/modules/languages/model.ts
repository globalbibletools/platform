export enum TextDirectionRaw {
  LTR = "ltr",
  RTL = "rtl",
}

export const MachineGlossStrategy = {
  Google: "google",
  LLM: "llm",
  None: "none",
} as const;
export type MachineGlossStrategy =
  (typeof MachineGlossStrategy)[keyof typeof MachineGlossStrategy];

export class LanguageAlreadyExistsError extends Error {
  constructor(public code: string) {
    super();
  }
}

export class SourceLanguageMissingError extends Error {
  constructor(public languageId: string) {
    super();
  }
}

export interface Language {
  id: string;
  code: string;
  englishName: string;
  localName: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string | null;
  machineGlossStrategy: MachineGlossStrategy;
}

export interface LanguageMember {
  languageId: string;
  userId: string;
}
