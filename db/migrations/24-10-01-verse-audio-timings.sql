BEGIN;

DROP TABLE "VerseAudioTiming";
DROP TABLE "Recording";

CREATE TABLE "Recording" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE "VerseAudioTiming" (
    "id" SERIAL PRIMARY KEY,
    "verseId" TEXT NOT NULL REFERENCES "Verse" (id),
    "recordingId" TEXT NOT NULL REFERENCES "Recording" (id),
    "start" FLOAT,
    "end" FLOAT,
    UNIQUE("verseId", "recordingId")
);

INSERT INTO "Recording" (id, name) VALUES ('HEB', 'Abraham Schmueloff'), ('RDB', 'Rabbi Dan Beeri');

COMMIT;
