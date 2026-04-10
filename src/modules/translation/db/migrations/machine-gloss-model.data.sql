begin;

insert into machine_gloss_model (code)
values ('google'), ('llm_import')
on conflict (code) do nothing;

update machine_gloss mg
set model_id = (
  select mgm.id
  from machine_gloss_model mgm
  where mgm.code = case when l.code = 'hin' then 'llm_import' else 'google' end
)
from language l
where mg.language_id = l.id
  and mg.model_id is null;

commit;
