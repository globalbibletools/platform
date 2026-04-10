begin;

alter table machine_gloss
  alter column model_id set not null;

commit;
