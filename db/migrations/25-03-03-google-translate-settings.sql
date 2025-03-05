BEGIN;

ALTER TABLE language
    ADD COLUMN reference_language_id UUID REFERENCES language(id);

COMMIT;
