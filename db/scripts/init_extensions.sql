DO $$
BEGIN
    -- Check if pg_cron extension is available to install
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    ELSE
        RAISE NOTICE 'skipping pg_cron';
    END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
