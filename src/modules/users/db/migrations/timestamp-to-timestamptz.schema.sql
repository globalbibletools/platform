begin;

alter table session
    alter column expires_at type timestamptz using expires_at at time zone 'UTC';

alter table reset_password_token
    add column expires_at timestamptz null;

alter table user_email_verification
    add column expires_at timestamptz null;

alter table user_invitation
    add column expires_at timestamptz null;

commit;
