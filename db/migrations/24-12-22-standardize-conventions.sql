BEGIN;

ALTER TABLE "Book" RENAME TO book;
ALTER INDEX "Book_pkey" RENAME TO book_pkey;
ALTER INDEX "Book_name_key" RENAME TO book_name_key;

COMMIT;
