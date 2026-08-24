begin;

alter table recording
  add column testament text not null;

alter table recording
  add constraint recording_testament_check check (testament in ('OT', 'NT'));

commit;
