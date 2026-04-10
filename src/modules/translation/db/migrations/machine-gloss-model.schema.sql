begin;

create table machine_gloss_model (
  id serial primary key,
  code text not null unique
);

alter table machine_gloss
  add column model_id int references machine_gloss_model (id);

commit;
