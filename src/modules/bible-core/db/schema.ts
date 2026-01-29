export interface BookTable {
  id: number;
  name: string;
}

export interface VerseTable {
  id: string;
  number: number;
  book_id: number;
  chapter: number;
}

export interface WordTable {
  id: string;
  text: string;
  verse_id: string;
  form_id: string;
}

export interface VerseQuestionTable {
  verse_id: string;
  sort_order: number;
  question: string;
  response: string;
}

export interface VerseCommentaryTable {
  verse_id: string;
  content: string;
}

export interface WordLexiconTable {
  word_id: string;
  content: string;
}

export interface Lemma {
  id: string;
}

export interface LemmaFormTable {
  id: string;
  grammar: string;
  lemma_id: string;
}

export interface LemmaResourceTable {
  lemma_id: string;
  resource_code: string;
  content: string;
}
