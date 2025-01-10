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
    ADD UNIQUE (word_id, language_id, model_id),
    ADD COLUMN updated_at TIMESTAMP,
    ADD COLUMN updated_by UUID REFERENCES users (id);

UPDATE machine_gloss
    SET model_id = (SELECT id FROM machine_gloss_model WHERE code = 'google-translate');

ALTER TABLE machine_gloss
    ALTER COLUMN model_id SET NOT NULL;

CREATE TABLE machine_gloss_history (
    id SERIAL PRIMARY KEY,
    machine_gloss_id INT NOT NULL REFERENCES machine_gloss (id),
    gloss TEXT NOT NULL,
    updated_at TIMESTAMP,
    updated_by UUID REFERENCES users (id)
);

CREATE OR REPLACE FUNCTION machine_gloss_audit()
RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO machine_gloss_history AS c (machine_gloss_id, gloss, updated_at, updated_by)
    VALUES (OLD."id", OLD.gloss, OLD.updated_at, OLD.updated_by);

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER machine_gloss_audit
AFTER UPDATE OR DELETE
ON machine_gloss
FOR EACH ROW 
EXECUTE FUNCTION machine_gloss_audit();

COMMIT;
