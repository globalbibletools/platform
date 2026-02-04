begin;

alter table job drop column type_id;

drop table job_type;

commit;
