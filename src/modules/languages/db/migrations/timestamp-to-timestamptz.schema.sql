alter table language_member
    alter column invited_at type timestamptz using invited_at at time zone 'UTC';
