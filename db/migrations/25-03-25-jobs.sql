begin;

create table job_type (
    id serial primary key,
    name text unique
);

create type job_status as enum ('pending', 'in-progress', 'complete', 'error');

create table job (
    id uuid primary key,
    type_id int not null references job_type(id),
    status job_status not null,
    payload jsonb,
    data jsonb,
    created_at timestamp not null,
    updated_at timestamp not null
);

insert into job_type (id, name)
values
    (1, 'send_email'),
    (2, 'import_language'),
    (3, 'export_languages'),
    (4, 'export_language'),
    (5, 'export_analytics');

commit;
