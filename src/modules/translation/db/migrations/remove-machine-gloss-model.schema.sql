begin;

alter table machine_gloss
    drop column model_id,
    drop column updated_at,
    drop column updated_by;

drop table machine_gloss_history;
drop table machine_gloss_model;

commit;
