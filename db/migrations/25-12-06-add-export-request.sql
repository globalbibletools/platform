create type export_request_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED');

create table export_request (
  id uuid primary key default generate_ulid(),
  language_id uuid not null references language(id) on delete cascade,
  book_id integer references book(id),
  chapters integer[],
  layout text not null default 'standard',
  status export_request_status not null default 'PENDING',
  job_id uuid references job(id),
  download_url text,
  expires_at timestamptz,
  requested_by uuid not null references users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  export_key text
);

create index export_request_status_idx on export_request(status);
create index export_request_requested_by_idx on export_request(requested_by);
create index export_request_expires_at_idx on export_request(expires_at);

create table if not exists export_request_book (
  request_id uuid not null references export_request(id) on delete cascade,
  book_id integer not null references book(id),
  chapters integer[] not null,
  primary key (request_id, book_id)
);

create index if not exists export_request_book_request_idx on export_request_book(request_id);

insert into job_type (name)
values
  ('export_interlinear_pdf'),
  ('cleanup_exports')
on conflict (name) do nothing;
