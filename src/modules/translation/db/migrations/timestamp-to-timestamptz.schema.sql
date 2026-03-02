begin;

alter table gloss
    alter column updated_at type timestamptz using updated_at at time zone 'UTC';

alter table gloss_history
    alter column updated_at type timestamptz using updated_at at time zone 'UTC';

alter table footnote
    alter column "timestamp" type timestamptz using "timestamp" at time zone 'UTC';

alter table translator_note
    alter column "timestamp" type timestamptz using "timestamp" at time zone 'UTC';

-- language_progress depends on phrase.deleted_at, so drop and recreate around the alter
drop materialized view language_progress;

-- decrement_suggestion trigger fires on UPDATE OF deleted_at, must drop and recreate
drop trigger decrement_suggestion on phrase;

alter table phrase
    alter column created_at type timestamptz using created_at at time zone 'UTC',
    alter column deleted_at type timestamptz using deleted_at at time zone 'UTC';

create trigger decrement_suggestion
    after update of deleted_at on phrase
    for each row execute function decrement_suggestion_after_phrase_delete();

create materialized view language_progress as (
    with data as (
        select ph.language_id as id, v.book_id >= 40 as is_nt, count(*) as count from phrase as ph
        join phrase_word as phw on phw.phrase_id = ph.id
        join word as w on w.id = phw.word_id
        join verse as v on v.id = w.verse_id
        join gloss as g on g.phrase_id = ph.id
        where ph.deleted_at is null
        group by ph.language_id, v.book_id >= 40
    ),
    ot_total as (
        select count(*) as total from word as w
        join verse as v on v.id = w.verse_id
        where v.book_id < 40
    ),
    nt_total as (
        select count(*) as total from word as w
        join verse as v on v.id = w.verse_id
        where v.book_id >= 40
    )
    select
        l.code,
        coalesce(nt_data.count, 0)::float / (select nt_total.total::float from nt_total) as "nt_progress",
        coalesce(ot_data.count, 0)::float / (select ot_total.total::float from ot_total) as "ot_progress"
    from language as l
    left join data as nt_data
        on nt_data.id = l.id and nt_data.is_nt = true
    left join data as ot_data
        on ot_data.id = l.id and ot_data.is_nt = false
);

alter table language_import_job
    alter column start_date type timestamptz using start_date at time zone 'UTC',
    alter column end_date type timestamptz using end_date at time zone 'UTC';

commit;
