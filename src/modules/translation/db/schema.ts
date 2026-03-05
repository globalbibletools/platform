import { Generated } from "kysely";
import { GlossSourceRaw, GlossStateRaw } from "../types";

/**
 * A phrase — a span of one or more original-language words that corresponds to
 * a single translation unit within a target language.
 */
export interface PhraseTable {
  /** Auto-generated unique identifier for the phrase. */
  id: Generated<number>;
  /** The target language this phrase belongs to. @relation language (many-to-one) */
  language_id: string;
  /** Timestamp of when the phrase was created. */
  created_at: Date;
  /** The user who created the phrase, or null if created by the system. */
  created_by: string | null;
  /** Timestamp of when the phrase was soft-deleted, or null if active. */
  deleted_at: Date | null;
  /** The user who deleted the phrase, or null if not deleted. */
  deleted_by: string | null;
}

/**
 * The current approved gloss for a phrase in its target language.
 * There is exactly one gloss row per phrase.
 */
export interface GlossTable {
  /** The phrase this gloss translates. @relation phrase (one-to-one) */
  phrase_id: number;
  /** The translated text, or null if the phrase has not yet been glossed. */
  gloss: string | null;
  /** The workflow state of the gloss (e.g. unapproved, approved). Defaults to unapproved. */
  state: Generated<GlossStateRaw>;
  /** The source that provided this gloss (e.g. human, machine). */
  source: GlossSourceRaw | null;
  /** Timestamp of the last update to this gloss. */
  updated_at: Date;
  /** The user who last updated the gloss, or null if updated by the system. */
  updated_by: string | null;
}

/**
 * An immutable audit record of every historical value for a gloss.
 * A new row is appended each time the gloss changes.
 */
export interface GlossHistoryTable {
  /** Auto-generated unique identifier for this history entry. */
  id: Generated<number>;
  /** The phrase whose gloss history this entry records. @relation phrase (many-to-one) */
  phrase_id: number;
  /** The gloss text at the time of this history entry. */
  gloss: string | null;
  /** The workflow state at the time of this history entry. */
  state: GlossStateRaw | null;
  /** The source at the time of this history entry. */
  source: GlossSourceRaw | null;
  /** Timestamp when this history entry was recorded. */
  updated_at: Date;
  /** The user who made the change, or null if made by the system. */
  updated_by: string | null;
}

/**
 * A note written by a translator about how to translate a specific phrase.
 */
export interface TranslatorNoteTable {
  /** The phrase this note is about. @relation phrase (many-to-one) */
  phrase_id: number;
  /** The user who authored this note. */
  author_id: string;
  /** When the note was written. */
  timestamp: Date;
  /** The note content. */
  content: string;
}

/**
 * A published footnote attached to a phrase for use in the translated output.
 */
export interface FootnoteTable {
  /** The phrase this footnote is attached to. @relation phrase (many-to-one) */
  phrase_id: number;
  /** The user who authored this footnote. */
  author_id: string;
  /** When the footnote was written. */
  timestamp: Date;
  /** The footnote content. */
  content: string;
}

/**
 * Join table linking a phrase to the original-language words it spans.
 */
export interface PhraseWordTable {
  /** The phrase in this mapping. @relation phrase (many-to-one) */
  phrase_id: number;
  /** The original-language word in this mapping. @relation word (many-to-one) */
  word_id: string;
}

/**
 * A machine-generated gloss suggestion for a single original-language word
 * in a given target language.
 */
export interface MachineGlossTable {
  /** Auto-generated unique identifier. */
  id: Generated<number>;
  /** The original-language word this suggestion is for. @relation word (many-to-one) */
  word_id: string;
  /** The target language this suggestion is for. @relation language (many-to-one) */
  language_id: string;
  /** The suggested gloss text. */
  gloss: string;
}
