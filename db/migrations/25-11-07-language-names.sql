BEGIN;

ALTER TABLE public.language
    RENAME COLUMN name TO english_name;

ALTER TABLE public.language
    ADD COLUMN local_name text;

UPDATE public.language
SET local_name = english_name;

ALTER TABLE public.language
    ALTER COLUMN local_name SET NOT NULL;

COMMIT;