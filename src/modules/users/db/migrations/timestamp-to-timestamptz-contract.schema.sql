begin;

alter table reset_password_token alter column expires_at set not null;
alter table user_email_verification alter column expires_at set not null;
alter table user_invitation alter column expires_at set not null;

alter table reset_password_token drop column expires;
alter table user_email_verification drop column expires;
alter table user_invitation drop column expires;

commit;
