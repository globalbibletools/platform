begin;

create table book_completion (
  id           integer     primary key generated always as identity,
  language_id  uuid        not null references language(id),
  book_id      integer     not null references book(id),
  refreshed_at timestamptz not null,
  updated_at   timestamptz not null,
  completed_at timestamptz
);

create unique index book_completion_unique on book_completion (language_id, book_id);

commit;