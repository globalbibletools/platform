begin;

-- Single-word events: set word_id directly from the only element
update gloss_event
set word_id = word_ids[1]
where array_length(word_ids, 1) = 1
  and word_id is null;

-- Multi-word events: insert one row per word using unnest, then delete the originals
insert into gloss_event (
  id, phrase_id, language_id, user_id, word_id,
  word_ids, timestamp, prev_gloss, prev_state,
  new_gloss, new_state, approval_method
)
select
  generate_ulid(),
  phrase_id,
  language_id,
  user_id,
  unnest(word_ids),
  word_ids,
  timestamp,
  prev_gloss,
  prev_state,
  new_gloss,
  new_state,
  approval_method
from gloss_event
where array_length(word_ids, 1) > 1
  and word_id is null;

delete from gloss_event
where array_length(word_ids, 1) > 1
  and word_id is null;

delete from gloss_event
  where word_id is null;

commit;
