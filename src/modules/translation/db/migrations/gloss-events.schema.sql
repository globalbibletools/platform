begin;

create table gloss_event (
  id              uuid primary key,
  phrase_id       int not null references phrase(id),
  language_id     uuid not null references language(id),
  user_id         uuid not null references users(id),
  word_ids        text[] not null,
  timestamp       timestamptz not null,
  prev_gloss      text not null,
  prev_state      text not null,
  new_gloss       text not null,
  new_state       text not null,
  approval_method text
);

commit;
