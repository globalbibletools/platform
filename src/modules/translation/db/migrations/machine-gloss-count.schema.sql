begin;

create table machine_gloss_count (
  id           integer primary key generated always as identity,
  language_id  uuid        not null references language(id),
  book_id      integer     not null references book(id),
  model_id     integer     not null references machine_gloss_model(id),
  count        integer     not null,
  refreshed_at timestamptz not null
);

create unique index machine_gloss_count_unique
  on machine_gloss_count (language_id, book_id, model_id);

commit;