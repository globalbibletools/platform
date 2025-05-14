begin;

create table tracking_event (
  id uuid primary key,
  type text not null,
  data jsonb not null,
  user_id uuid,
  language_id uuid,
  created_at timestamp
);

commit;
