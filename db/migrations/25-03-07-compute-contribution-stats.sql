begin;

create table weekly_contribution_statistics (
    id serial primary key,
    week timestamp not null,
    language_id uuid not null references language (id),
    user_id uuid not null references users (id),
    approved_count int not null,
    revoked_count int not null,
    edited_approved_count int not null,
    edited_unapproved_count int not null,
    unique (week, language_id, user_id)
);

create or replace function generate_weekly_contribution_stats(d timestamp)
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
        date_bin('7 days', date_trunc('day', $1), timestamp '2024-12-15'),
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
            DISTINCT ON (ph.language_id, phw.word_id)
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
        where log.updated_at > date_bin('7 days', date_trunc('day', $1), timestamp '2024-12-15')
            and log.updated_at < date_bin('7 days', date_trunc('day', $1 + interval '7 days'), timestamp '2024-12-15')
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
                    and gloss.updated_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamp '2024-12-15')
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
                    and phrase.deleted_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamp '2024-12-15')
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

select cron.schedule(
    'Generate Weekly Contribution Statistics',
    '5 0 * * 0',
    'select generate_weekly_contribution_stats(now());'
);

select generate_weekly_contribution_stats(week) from (
    select timestamp '2024-02-04' + interval '7 days' * generate_series(0, floor(extract(day from now() - timestamp '2024-02-04') / 7) - 1) AS week
) series;

commit;
