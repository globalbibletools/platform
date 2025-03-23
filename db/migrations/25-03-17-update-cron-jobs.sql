begin;

select cron.unschedule(1);
select cron.unschedule(2);
select cron.unschedule(3);

select cron.schedule('refresh-language-progress', '0 0 * * *', 'refresh materialized view language_progress;');
select cron.schedule('weekly-gloss-stats', '5 0 * * *', 'select generate_gloss_statistics_for_week(now()::timestamp);');
select cron.schedule('weekly-contribution-stats', '5 0 * * *', 'select generate_weekly_contribution_stats(now()::timestamp);');

delete from weekly_contribution_statistics;
delete from weekly_gloss_statistics;

select generate_weekly_contribution_stats(week), generate_gloss_statistics_for_week(week) from (
    select timestamp '2024-02-04' + interval '7 days' * generate_series(0, floor(extract(day from now() - timestamp '2024-02-04') / 7) - 1) AS week
) series;

commit;
