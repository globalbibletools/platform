begin;

alter table book_completion_progress drop column refreshed_at;

commit;