import { Generated } from "kysely";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";

export interface LanguageTable {
  id: Generated<string>;
  code: string;
  local_name: string;
  english_name: string;
  font: Generated<string>;
  text_direction: Generated<TextDirectionRaw>;
  translation_ids: Generated<Array<string>> | null;
  reference_language_id: string | null;
  machine_gloss_strategy: Generated<MachineGlossStrategy>;
}

export interface LanguageMemberTable {
  user_id: string;
  language_id: string;
  invited_at: Date;
}

export interface LanguageProgressView {
  code: string;
  nt_progress: number;
  ot_progress: number;
}
