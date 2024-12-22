BEGIN;

ALTER TABLE "Book" RENAME TO book;
ALTER INDEX "Book_pkey" RENAME TO book_pkey;
ALTER INDEX "Book_name_key" RENAME TO book_name_key;

ALTER TABLE "Footnote" RENAME TO footnote;
ALTER TABLE footnote RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE footnote RENAME COLUMN "authorId" TO author_id;
ALTER TABLE footnote RENAME CONSTRAINT "Footnote_authorId_fkey" TO footnote_author_id_fkey;
ALTER TABLE footnote RENAME CONSTRAINT "Footnote_phraseId_fkey" TO footnote_phrase_id_fkey;
ALTER INDEX "Footnote_pkey" RENAME TO footnote_pkey;
ALTER INDEX "Footnote_phraseId_idx" RENAME TO footnote_phraseId_idx;

COMMIT;
