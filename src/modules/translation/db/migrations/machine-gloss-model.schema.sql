begin;

create table machine_gloss_model (
  id serial primary key,
  code text not null unique
);

alter table machine_gloss
  add column model_id int references machine_gloss_model (id);

drop index if exists idx_machine_gloss_language_word;

create unique index idx_machine_gloss_language_word
  on machine_gloss (language_id, word_id, model_id);

commit;
