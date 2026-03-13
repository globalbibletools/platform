alter table gloss_event
  alter column word_ids drop not null,
  add column word_id text references word(id);
