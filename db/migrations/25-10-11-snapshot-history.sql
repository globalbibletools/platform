begin;

create table language_snapshot (
    id uuid primary key,
    language_id uuid references language(id) not null,
    timestamp timestamptz not null
);

end;
