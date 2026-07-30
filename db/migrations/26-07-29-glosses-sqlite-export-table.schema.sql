begin;

create table glosses_sqlite_export (
  language_id uuid primary key references language(id) on delete cascade,
  s3_key      text not null,
  sha256      text not null,
  size        bigint not null,
  updated_at  timestamptz not null
);

commit;
