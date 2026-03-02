begin;

update reset_password_token
set expires_at = to_timestamp(expires / 1000.0)
where expires_at is null;

update user_email_verification
set expires_at = to_timestamp(expires / 1000.0)
where expires_at is null;

update user_invitation
set expires_at = to_timestamp(expires / 1000.0)
where expires_at is null;

commit;
