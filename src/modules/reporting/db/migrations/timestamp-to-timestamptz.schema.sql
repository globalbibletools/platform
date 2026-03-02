begin;

alter table tracking_event
    alter column created_at type timestamptz using created_at at time zone 'UTC';

alter table weekly_contribution_statistics
    alter column week type timestamptz using week at time zone 'UTC';

alter table weekly_gloss_statistics
    alter column week type timestamptz using week at time zone 'UTC';

create or replace function public.generate_gloss_statistics_for_week(d timestamptz)
returns void
language sql
as $$
    insert into weekly_gloss_statistics (week, language_id, book_id, user_id, approved_count, unapproved_count)
    select
        (date_bin('7 days', date_trunc('day', $1), timestamptz '2024-12-15 00:00:00 UTC')),
        log.language_id, log.book_id, log.updated_by,
        count(*) filter (where log.state = 'APPROVED'),
        count(*) filter (where log.state = 'UNAPPROVED')
    from (
        select
            distinct on (log.phrase_id, phrase_word.word_id, verse.book_id)
            log.updated_by,
            log.state,
            phrase.language_id,
            verse.book_id
        from (
            (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss
            ) union all (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss_history
            )
        ) log
        join phrase on phrase.id = log.phrase_id
        join phrase_word on phrase_word.phrase_id = phrase.id
        join word on word.id = phrase_word.word_id
        join verse on verse.id = word.verse_id
        where log.updated_at < (date_bin('7 days', date_trunc('day', $1), timestamptz '2024-12-15 00:00:00 UTC'))
            and (phrase.deleted_at is null
                or phrase.deleted_at < (date_bin('7 days', date_trunc('day', $1), timestamptz '2024-12-15 00:00:00 UTC')))
        order by log.phrase_id, phrase_word.word_id, verse.book_id, log.updated_at desc
    ) log
    group by log.language_id, log.book_id, log.updated_by
    order by log.language_id, log.book_id, log.updated_by
    on conflict (language_id, book_id, user_id, week)
    do update set
        approved_count = excluded.approved_count,
        unapproved_count = excluded.unapproved_count;
$$;

create or replace function generate_weekly_contribution_stats(d timestamptz)
returns void
language sql
as $$
    insert into weekly_contribution_statistics (
        week,
        language_id,
        user_id,
        approved_count,
        revoked_count,
        edited_approved_count,
        edited_unapproved_count
    )
    select
        date_bin('7 days', date_trunc('day', $1), timestamptz '2024-12-15 00:00:00 UTC'),
        changed_phrase.language_id,
        changed_phrase.updated_by,
        coalesce(count(*) filter (
            where changed_phrase.state = 'APPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'UNAPPROVED'
        ), 0) as words_approved,
        coalesce(count(*) filter (
            where changed_phrase.state = 'UNAPPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'APPROVED'
        ), 0) as words_revoked,
        coalesce(count(*) filter (
            where changed_phrase.gloss <> coalesce(prev_phrase.gloss, '')
                and changed_phrase.state = 'APPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'APPROVED'
        ), 0) as words_approved_edited,
        coalesce(count(*) filter (
            where changed_phrase.gloss <> coalesce(prev_phrase.gloss, '')
                and changed_phrase.state = 'UNAPPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'UNAPPROVED'
        ), 0) as words_unapproved_edited
    from (
        select
            distinct on (ph.language_id, phw.word_id)
            ph.language_id, phw.word_id,
            log.*
        from (
            (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss
            ) union all (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss_history
            ) union all (
                select
                    id as phrase_id,
                    deleted_by as updated_by,
                    deleted_at as updated_at,
                    '' as gloss,
                    'UNAPPROVED' as state
                from phrase
                where deleted_by is not null and deleted_at is not null
            )
        ) log
        join phrase_word phw on phw.phrase_id = log.phrase_id
        join phrase ph on ph.id = log.phrase_id
        where log.updated_at > date_bin('7 days', date_trunc('day', $1), timestamptz '2024-12-15 00:00:00 UTC')
            and log.updated_at < date_bin('7 days', date_trunc('day', $1 + interval '7 days'), timestamptz '2024-12-15 00:00:00 UTC')
        order by ph.language_id, phw.word_id, log.updated_at desc
        ) changed_phrase
    left join lateral (
        select h.* from (
            (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss
                where exists (
                        select 1 from phrase_word phw
                        join phrase ph on ph.id = phw.phrase_id
                        where ph.id = gloss.phrase_id
                            and ph.language_id = changed_phrase.language_id
                            and phw.word_id = changed_phrase.word_id
                    )
                    and gloss.updated_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamptz '2024-12-15 00:00:00 UTC')
            ) union all (
                select
                    id as phrase_id,
                    deleted_by as updated_by,
                    deleted_at as updated_at,
                    '' as gloss,
                    'UNAPPROVED' as state
                from phrase
                where deleted_by is not null and deleted_at is not null
                    and phrase.language_id = changed_phrase.language_id
                    and exists (
                        select 1 from phrase_word phw
                        where phw.phrase_id = phrase.id
                            and phw.word_id = changed_phrase.word_id
                    )
                    and phrase.deleted_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamptz '2024-12-15 00:00:00 UTC')
            )
        ) h
        order by h.updated_at desc
        limit 1
    ) prev_phrase on true
    where changed_phrase.updated_by is not null
    group by changed_phrase.language_id, changed_phrase.updated_by
    on conflict (language_id, user_id, week)
    do update set
        approved_count = excluded.approved_count,
        revoked_count = excluded.revoked_count,
        edited_approved_count = excluded.edited_approved_count,
        edited_unapproved_count = excluded.edited_unapproved_count;
$$;

drop function public.generate_gloss_statistics_for_week(timestamp without time zone);
drop function public.generate_weekly_contribution_stats(timestamp without time zone);

select cron.unschedule(jobid) from cron.job where jobname = 'weekly-gloss-stats';
select cron.unschedule(jobid) from cron.job where jobname = 'weekly-contribution-stats';

select cron.schedule('weekly-gloss-stats', '5 0 * * *', 'select generate_gloss_statistics_for_week(now());');
select cron.schedule('weekly-contribution-stats', '5 0 * * *', 'select generate_weekly_contribution_stats(now());');

commit;
