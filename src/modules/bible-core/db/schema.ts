/**
 * A book of the Bible.
 */
export interface BookTable {
  /**
   * The ID of the book of the Bible.
   * Corresponds to the canonical order of the book starting with 1.
   */
  id: number;
  /** The three-letter book code (e.g. "GEN", "MAT"). */
  name: string;
}

/**
 * A single verse within a Bible book.
 */
export interface VerseTable {
  /**
   * The ID of the verse in the format BBCCCVVV where BB is the two-digit
   * book number, CCC is the three-digit chapter number, and VVV is the
   * three-digit verse number.
   */
  id: string;
  /** The verse number within its chapter. */
  number: number;
  /** The ID of the book this verse belongs to. @relation book (many-to-one) */
  book_id: number;
  /** The chapter number this verse belongs to. */
  chapter: number;
}

/**
 * A single Hebrew or Greek word in the original-language text.
 */
export interface WordTable {
  /** Unique identifier for the word occurrence. */
  id: string;
  /** The surface form of the word as it appears in the text. */
  text: string;
  /** The verse this word belongs to. @relation verse (many-to-one) */
  verse_id: string;
  /** The morphological form entry for this word. @relation lemma_form (many-to-one) */
  form_id: string;
}

/**
 * A comprehension question associated with a verse, used for study aids.
 */
export interface VerseQuestionTable {
  /** The verse this question is attached to. @relation verse (many-to-one) */
  verse_id: string;
  /** The display order of this question among all questions for the verse. */
  sort_order: number;
  /** The question text. */
  question: string;
  /** The expected or model response to the question. */
  response: string;
}

/**
 * A commentary note associated with a specific verse.
 */
export interface VerseCommentaryTable {
  /** The verse this commentary is attached to. @relation verse (many-to-one) */
  verse_id: string;
  /** The commentary content, may contain rich text. */
  content: string;
}

/**
 * Lexicon entry content associated with a specific word occurrence.
 */
export interface WordLexiconTable {
  /** The word occurrence this lexicon entry describes. @relation word (many-to-one) */
  word_id: string;
  /** The lexicon content for this word, may contain rich text. */
  content: string;
}

/**
 * A lexical lemma — the dictionary headword form of a Hebrew or Greek word.
 */
export interface LemmaTable {
  /** Unique identifier for the lemma. */
  id: string;
}

/**
 * A specific inflected morphological form of a lemma.
 */
export interface LemmaFormTable {
  /** Unique identifier for this form. */
  id: string;
  /** Morphological grammar code describing this form (e.g. part of speech, tense). */
  grammar: string;
  /** The lemma this form belongs to. @relation lemma (many-to-one) */
  lemma_id: string;
}

/**
 * A resource (e.g. lexicon article, dictionary entry) linked to a lemma.
 */
export interface LemmaResourceTable {
  /** The lemma this resource describes. @relation lemma (many-to-one) */
  lemma_id: string;
  /** A code identifying the type or source of the resource (e.g. "BDAG"). */
  resource_code: string;
  /** The resource content, may contain rich text or structured data. */
  content: string;
}
