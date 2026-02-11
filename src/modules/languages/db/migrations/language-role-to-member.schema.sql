begin;

create table language_member(
    language_id uuid not null references language(id),
    user_id uuid not null references users(id),
    invited_at timestamp not null,
    primary key (language_id, user_id)
);

commit;
