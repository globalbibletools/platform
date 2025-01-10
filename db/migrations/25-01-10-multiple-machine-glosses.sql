BEGIN;

CREATE TABLE machine_gloss_model (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL
);

INSERT INTO machine_gloss_model (code) VALUES ('google-translate'), ('gpt-4o-mini');

ALTER TABLE machine_gloss
    DROP CONSTRAINT machine_gloss_pkey,
    ADD COLUMN id SERIAL PRIMARY KEY,
    ADD COLUMN model_id INT REFERENCES machine_gloss_model (id),
    ADD UNIQUE (word_id, language_id, model_id);

UPDATE machine_gloss
    SET model_id = (SELECT id FROM machine_gloss_model WHERE code = 'google-translate');

ALTER TABLE machine_gloss
    ALTER COLUMN model_id SET NOT NULL;

COMMIT;
