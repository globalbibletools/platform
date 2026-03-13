begin;

-- Reconstruct gloss events from gloss_history + current gloss rows.
--
-- Only events where the "new" state was written by a USER source are included.
-- The previous state may have any source.
--
-- For each phrase that has a gloss (current or historical):
--   1. The "initial creation" event has prev = ('', 'UNAPPROVED') and
--      after = the earliest gloss_history row with source='USER', or the
--      current gloss if there is no history and source='USER'.
--   2. Each subsequent update pairs consecutive history rows: the earlier row
--      is "before", the later row is "after". The after row must have
--      source='USER'. For the final gap the current gloss row is "after"
--      (again, only when source='USER').
--   3. Deleted phrases receive a terminal event beyond the current gloss row:
--      new_gloss = prev_gloss (unchanged), new_state = 'UNAPPROVED',
--      user_id = phrase.deleted_by, timestamp = phrase.deleted_at.
--
-- user_id    = the "after" row's updated_by (or deleted_by for deletion events)
-- timestamp  = the "after" row's updated_at (or deleted_at for deletion events)
-- word_ids   = current phrase_word rows for that phrase (joined at migration time)
-- approval_method = NULL (not reliably reconstructable)

with
-- gloss_history rows ordered within each phrase, carrying source for filtering.
history_ordered as (
  select
    phrase_id,
    coalesce(gloss, '')           as gloss,
    coalesce(state, 'UNAPPROVED') as state,
    source,
    updated_by,
    updated_at,
    row_number() over (partition by phrase_id order by updated_at, id) as rn
  from gloss_history
),

-- Current gloss row treated as the "final after" state for each phrase.
current_gloss as (
  select
    g.phrase_id,
    coalesce(g.gloss, '')           as gloss,
    coalesce(g.state, 'UNAPPROVED') as state,
    g.source,
    g.updated_by,
    g.updated_at
  from gloss g
),

-- Maximum history rank per phrase.
max_rn as (
  select phrase_id, max(rn) as max_rn
  from history_ordered
  group by phrase_id
),

-- All event pairs: (before, after).
-- Each history row IS the "before" state (the trigger captures OLD values).
-- The "after" state is the next history row, or the current gloss for the last gap.
-- Only include events where the after row has source = 'USER'.
event_pairs as (
  -- Gap between history row N and history row N+1 (after must be USER)
  select
    h_before.phrase_id,
    h_before.gloss           as prev_gloss,
    h_before.state           as prev_state,
    h_after.gloss            as new_gloss,
    h_after.state            as new_state,
    h_after.updated_by       as user_id,
    h_after.updated_at       as ts
  from history_ordered h_before
  join history_ordered h_after
    on h_after.phrase_id = h_before.phrase_id
   and h_after.rn = h_before.rn + 1
  where h_after.source = 'USER'

  union all

  -- Gap between the last history row and the current gloss (after must be USER)
  select
    h.phrase_id,
    h.gloss                  as prev_gloss,
    h.state                  as prev_state,
    cg.gloss                 as new_gloss,
    cg.state                 as new_state,
    cg.updated_by            as user_id,
    cg.updated_at            as ts
  from history_ordered h
  join max_rn mr on mr.phrase_id = h.phrase_id and h.rn = mr.max_rn
  join current_gloss cg on cg.phrase_id = h.phrase_id
  where cg.source = 'USER'

  union all

  -- Initial creation event: before = ('', 'UNAPPROVED'),
  -- after = earliest history row (after must be USER)
  select
    h.phrase_id,
    ''                       as prev_gloss,
    'UNAPPROVED'             as prev_state,
    h.gloss                  as new_gloss,
    h.state                  as new_state,
    h.updated_by             as user_id,
    h.updated_at             as ts
  from history_ordered h
  where h.rn = 1
    and h.source = 'USER'

  union all

  -- Initial creation event for phrases with NO history (after must be USER)
  select
    cg.phrase_id,
    ''                       as prev_gloss,
    'UNAPPROVED'             as prev_state,
    cg.gloss                 as new_gloss,
    cg.state                 as new_state,
    cg.updated_by            as user_id,
    cg.updated_at            as ts
  from current_gloss cg
  where cg.source = 'USER'
    and not exists (
      select 1 from gloss_history gh where gh.phrase_id = cg.phrase_id
    )

  union all

  -- Terminal deletion event for soft-deleted phrases that have a current gloss.
  -- new_gloss = prev_gloss (text unchanged), new_state = 'UNAPPROVED'.
  -- No source filter: deletion is not a gloss write.
  select
    cg.phrase_id,
    cg.gloss                 as prev_gloss,
    cg.state                 as prev_state,
    cg.gloss                 as new_gloss,
    'UNAPPROVED'             as new_state,
    p.deleted_by             as user_id,
    p.deleted_at             as ts
  from current_gloss cg
  join phrase p on p.id = cg.phrase_id
  where p.deleted_at is not null
    and p.deleted_by is not null
),

-- Attach language_id from phrase and word_ids from phrase_word.
enriched as (
  select
    ep.phrase_id,
    p.language_id,
    ep.user_id,
    array_agg(pw.word_id order by pw.word_id) filter (where pw.word_id is not null) as word_ids,
    ep.ts             as timestamp,
    ep.prev_gloss,
    ep.prev_state,
    ep.new_gloss,
    ep.new_state
  from event_pairs ep
  join phrase p on p.id = ep.phrase_id
  left join phrase_word pw on pw.phrase_id = ep.phrase_id
  where ep.user_id is not null
  and p.language_id <> (select id from language where code = 'test')
  group by
    ep.phrase_id, p.language_id, ep.user_id,
    ep.ts, ep.prev_gloss, ep.prev_state, ep.new_gloss, ep.new_state
)

insert into gloss_event (
  id,
  phrase_id,
  language_id,
  user_id,
  word_ids,
  timestamp,
  prev_gloss,
  prev_state,
  new_gloss,
  new_state,
  approval_method
)
select
  gen_random_uuid(),
  phrase_id,
  language_id::uuid,
  user_id::uuid,
  coalesce(word_ids, '{}'),
  timestamp,
  prev_gloss,
  prev_state,
  new_gloss,
  new_state,
  null
from enriched;

commit;
