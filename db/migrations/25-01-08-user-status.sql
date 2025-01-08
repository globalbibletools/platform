CREATE TYPE user_status AS ENUM ('active', 'disabled');

ALTER TABLE users
    ADD COLUMN status user_status DEFAULT 'active';

UPDATE users SET status = 'active';

ALTER TABLE users
    ALTER COLUMN status SET NOT NULL;
