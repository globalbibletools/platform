import { TextDirectionRaw } from "../model";

export interface DbLanguage {
  id: string;
  code: string;
  englishName: string;
  localName: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string | null;
}

export interface DbLanguageMember {
  languageId: string;
  userId: string;
  invitedAt: Date;
}
