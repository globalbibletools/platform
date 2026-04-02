alter table job add column parent_job_id uuid references job(id);

create index job_parent_job_id on job(parent_job_id) where parent_job_id is not null;
