begin;

create table contribution_snapshot (
  id                      uuid primary key,
  day                     date not null,
  language_id             uuid not null references language(id),
  user_id                 uuid not null references users(id),
  book_id                 int  not null references book(id),
  approved_count          int  not null default 0,
  revoked_count           int  not null default 0,
  edited_approved_count   int  not null default 0,
  edited_unapproved_count int  not null default 0,
  unique (day, language_id, user_id, book_id)
);

commit;
