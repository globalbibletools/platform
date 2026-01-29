import { Generated } from "kysely";
import { GlossSourceRaw, GlossStateRaw } from "../types";

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
