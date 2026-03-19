begin;

create materialized view book_word_map as
  select w.id as word_id, v.book_id
  from word w
  join verse v on v.id = w.verse_id;

create unique index book_word_map_word_id on book_word_map (word_id);
create index book_word_map_book_id on book_word_map (book_id);

commit;
