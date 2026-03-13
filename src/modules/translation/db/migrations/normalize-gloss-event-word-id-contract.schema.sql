alter table gloss_event
  alter column word_id set not null,
  drop column word_ids;
