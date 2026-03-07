import { Generated } from "kysely";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";

export interface PhraseTable {
  id: Generated<number>;
  language_id: string;
  created_at: Date;
  created_by: string | null;
  deleted_at: Date | null;
  deleted_by: string | null;
}

export interface GlossTable {
  phrase_id: number;
  gloss: string | null;
  state: Generated<GlossStateRaw>;
  source: GlossSourceRaw | null;
  updated_at: Date;
  updated_by: string | null;
}

export interface GlossHistoryTable {
  id: Generated<number>;
  phrase_id: number;
  gloss: string | null;
  state: GlossStateRaw | null;
  source: GlossSourceRaw | null;
  updated_at: Date;
  updated_by: string | null;
}

export interface TranslatorNoteTable {
  phrase_id: number;
  author_id: string;
  timestamp: Date;
  content: string;
}

export interface FootnoteTable {
  phrase_id: number;
  author_id: string;
  timestamp: Date;
  content: string;
}

export interface PhraseWordTable {
  phrase_id: number;
  word_id: string;
}

export interface MachineGlossTable {
  id: Generated<number>;
  word_id: string;
  language_id: string;
  gloss: string;
}

export interface GlossEventTable {
  id: string;
  phrase_id: number;
  language_id: string;
  user_id: string;
  word_ids: string[] | null;
  word_id: string | null;
  timestamp: Date;
  prev_gloss: string;
  prev_state: GlossStateRaw;
  new_gloss: string;
  new_state: GlossStateRaw;
  approval_method: GlossApprovalMethodRaw | null;
}
