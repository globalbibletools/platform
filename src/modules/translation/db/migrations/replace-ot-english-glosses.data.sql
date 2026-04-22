begin;

with ph_del as (
    select phrase.id from phrase
    join lateral (
        select count(*) from phrase_word
        where phrase_word.phrase_id = phrase.id
        and phrase_word.word_id < '40'
    ) words on true
    where phrase.language_id = (select id from language where code = 'eng')
    and phrase.deleted_at is null
    and words.count > 1
)
update phrase set
    deleted_at = now()
from ph_del
where ph_del.id = phrase.id;

with new_word as (
    select word.id, row_number() over () as n from word
    where not exists (
        select 1 from phrase_word
        join phrase on phrase.id = phrase_word.phrase_id
        where phrase.language_id = (select id from language where code = 'eng')
        and phrase.deleted_at is null
        and phrase_word.word_id = word.id
    )
    and word.id < '40'
),
new_phrase as (
    insert into phrase (language_id, created_at)
    select (select id from language where code = 'eng'), now() from new_word
    returning phrase.id
)
insert into phrase_word (phrase_id, word_id)
select phrase.id, new_word.id from (select id, row_number() over () as n from new_phrase) phrase
join new_word on phrase.n = new_word.n
returning *;

with new_gloss as (
    select phrase.id, machine_gloss.gloss from word
    join machine_gloss on machine_gloss.word_id = word.id
    join phrase_word on phrase_word.word_id = word.id
    join phrase on phrase.id = phrase_word.phrase_id
    where machine_gloss.model_id = (select id from machine_gloss_model where code = 'llm_import')
    and machine_gloss.language_id = (select id from language where code = 'eng')
    and word.id < '40'
    and phrase.language_id = (select id from language where code = 'eng')
    and phrase.deleted_at is null
    order by word.id
)
insert into gloss (phrase_id, gloss, state, updated_at, updated_by)
select id, gloss, 'UNAPPROVED', now(), null from new_gloss
on conflict (phrase_id) do update set
    gloss = excluded.gloss,
    state = excluded.state,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

commit;
