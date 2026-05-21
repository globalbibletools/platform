-- Backfill machine_gloss_count for all existing machine glosses (llm_import model).
-- Mirrors the refreshForLanguage repository method, but for every language at once.

begin;

insert into machine_gloss_count (language_id, book_id, model_id, count, refreshed_at)
with counts as (
  select bwm.book_id,
         mg.model_id,
         mg.language_id,
         count(*) as count
    from machine_gloss mg
    join book_word_map bwm on bwm.word_id = mg.word_id
   where mg.model_id = (select id from machine_gloss_model where code = 'llm_import')
   group by bwm.book_id, mg.model_id, mg.language_id
)
select mgm.language_id,
       b.id as book_id,
       (select id from machine_gloss_model where code = 'llm_import'),
       coalesce(c.count, 0) as count,
       now() as refreshed_at
  from (select distinct mg.language_id from machine_gloss mg) mgm
  cross join book b
  left join counts c on c.book_id = b.id
                   and c.language_id = mgm.language_id
on conflict (language_id, book_id, model_id)
do update set count      = excluded.count,
              refreshed_at = excluded.refreshed_at;

commit;
