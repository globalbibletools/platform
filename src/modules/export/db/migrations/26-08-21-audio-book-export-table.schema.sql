begin;

create table audio_book_export (
  recording_id text    not null references recording(id) on delete cascade,
  book_id      int     not null references book(id) on delete cascade,
  s3_key       text    not null,
  sha256       text    not null,
  size         bigint  not null,
  updated_at   timestamptz not null,
  primary key (recording_id, book_id)
);

commit;
