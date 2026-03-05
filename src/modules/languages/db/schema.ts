import { Generated } from "kysely";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";

/**
 * A target language into which the Bible is being translated.
 */
export interface LanguageTable {
  /** Auto-generated unique identifier (typically a BCP 47 language tag). */
  id: Generated<string>;
  /** The ISO 639-3 language code. */
  code: string;
  /** The name of the language written in that language itself. */
  local_name: string;
  /** The name of the language in English. */
  english_name: string;
  /** The preferred web font for displaying text in this language. Defaults to the system font. */
  font: Generated<string>;
  /** The text direction used for this language (ltr or rtl). Defaults to ltr. */
  text_direction: Generated<TextDirectionRaw>;
  /** Optional list of translation source IDs to use as reference material. */
  translation_ids: Generated<Array<string>> | null;
  /** Another language used as a reference when translating, if any. @relation language (many-to-one) */
  reference_language_id: string | null;
  /** The strategy used to generate machine gloss suggestions for this language. */
  machine_gloss_strategy: Generated<MachineGlossStrategy>;
}

/**
 * Membership record granting a user access to work on a specific language.
 */
export interface LanguageMemberTable {
  /** The user who is a member. */
  user_id: string;
  /** The language this user is a member of. @relation language (many-to-one) */
  language_id: string;
  /** When the user was invited to become a member. */
  invited_at: Date;
}

/**
 * A read-only view reporting translation progress for each language.
 * Progress is expressed as a fraction of verses with an approved gloss.
 */
export interface LanguageProgressView {
  /** The ISO 639-3 language code identifying the language. */
  code: string;
  /** Fraction of New Testament verses that have an approved gloss (0–1). */
  nt_progress: number;
  /** Fraction of Old Testament verses that have an approved gloss (0–1). */
  ot_progress: number;
}
