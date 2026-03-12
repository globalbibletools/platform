begin;

create table book_completion_progress (
  id           integer     primary key generated always as identity,
  language_id  uuid        not null references language(id),
  book_id      integer     not null references book(id),
  user_id      uuid        references users(id),
  word_count   integer     not null,
  refreshed_at timestamptz not null
);

-- Simulate nulls not distinct which is available in postgres 15+
create unique index book_completion_progress_unique_with_user
  on book_completion_progress (language_id, book_id, user_id)
  where user_id is not null;

create unique index book_completion_progress_unique_null_user
  on book_completion_progress (language_id, book_id)
  where user_id is null;

commit;
