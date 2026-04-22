begin;

create table ai_gloss_language (
  code text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

commit;
