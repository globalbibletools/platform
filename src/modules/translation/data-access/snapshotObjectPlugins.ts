import { Readable } from "stream";
import { copyStream, query, queryStream } from "@/db";
import {
  PostgresTextFormatTransform,
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const translationSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  {
    resourceName: "phrase",
    async read(languageId: string) {
      return queryStream(
        `
          select * from phrase
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from phrase
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "phrase",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.id?.toString(),
            (record) => record.language_id,
            (record) => record.created_at,
            (record) => record.created_by,
            (record) => record.deleted_at,
            (record) => record.deleted_by,
          ]),
        ),
      );
    },
  },
  {
    resourceName: "phrase_word",
    async read(languageId: string) {
      return queryStream(
        `
          select * from phrase_word
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = phrase_word.phrase_id
          )
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from phrase_word
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = phrase_word.phrase_id
          )
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "phrase_word",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.phrase_id.toString(),
            (record) => record.word_id,
          ]),
        ),
      );
    },
  },
  {
    resourceName: "gloss",
    async read(languageId: string) {
      return queryStream(
        `
          select * from gloss
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = gloss.phrase_id
          )
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from gloss
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = gloss.phrase_id
          )
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "gloss",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.gloss,
            (record) => record.state,
            (record) => record.phrase_id.toString(),
            (record) => record.source,
            (record) => record.updated_at,
            (record) => record.updated_by,
          ]),
        ),
      );
    },
  },
  {
    resourceName: "gloss_history",
    async read(languageId: string) {
      return queryStream(
        `
          select * from gloss_history
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = gloss_history.phrase_id
          )
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from gloss_history
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = gloss_history.phrase_id
          )
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "gloss_history",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.id,
            (record) => record.gloss,
            (record) => record.state,
            (record) => record.phrase_id,
            (record) => record.source,
            (record) => record.updated_at,
            (record) => record.updated_by,
          ]),
        ),
      );
    },
  },
  {
    resourceName: "footnote",
    async read(languageId: string) {
      return queryStream(
        `
          select * from footnote
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = footnote.phrase_id
          )
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from footnote
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = footnote.phrase_id
          )
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "footnote",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.author_id,
            (record) => record.timestamp,
            (record) => record.content,
            (record) => record.phrase_id.toString(),
          ]),
        ),
      );
    },
  },
  {
    resourceName: "translator_note",
    async read(languageId: string) {
      return queryStream(
        `
          select * from translator_note
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = translator_note.phrase_id
          )
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from translator_note
          where exists (
            select 1 from phrase
            where language_id = $1
              and phrase.id = translator_note.phrase_id
          )
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "translator_note",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.author_id,
            (record) => record.timestamp,
            (record) => record.content,
            (record) => record.phrase_id.toString(),
          ]),
        ),
      );
    },
  },
  {
    resourceName: "lemma_form_suggestion",
    async clear(languageId: string) {
      await query(
        `
          delete from lemma_form_suggestion
          where language_id = $1
        `,
        [languageId],
      );
    },
  },
  {
    resourceName: "machine_gloss",
    async read(languageId: string) {
      return queryStream(
        `
          select * from machine_gloss
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string) {
      await query(
        `
          delete from machine_gloss
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable) {
      await copyStream(
        "machine_gloss",
        stream.pipe(
          new PostgresTextFormatTransform([
            (record) => record.word_id,
            (record) => record.language_id,
            (record) => record.gloss,
            (record) => record.id.toString(),
            (record) => record.model_id.toString(),
            (record) => record.updated_at,
            (record) => record.updated_by,
          ]),
        ),
      );
    },
  },
];
