select setval(
    pg_get_serial_sequence('job_type', 'id'),
    (select coalesce(max(id), 0) from job_type)
);

insert into job_type (name)
values
  ('export_interlinear_pdf')
on conflict (name) do nothing;
