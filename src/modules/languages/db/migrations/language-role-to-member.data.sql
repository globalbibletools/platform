begin;

insert into language_member (language_id, user_id, invited_at)
select
  language_id,
  user_id,
  now()
from (
  select
    distinct(language_id, user_id),
    language_id,
    user_id
  from language_member_role
) member;

commit;
