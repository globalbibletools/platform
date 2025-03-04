BEGIN;

ALTER TABLE language
    ADD COLUMN gt_source_lang TEXT DEFAULT 'en';

COMMIT;
