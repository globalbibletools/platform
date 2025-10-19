import {
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const translationSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  createPostgresSnapshotObjectPlugin({
    resourceName: "phrase",
    readSqlQuery: `
        select * from phrase
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from phrase
        where language_id = $1
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "phrase_word",
    readSqlQuery: `
        select * from phrase_word
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = phrase_word.phrase_id
        )
      `,
    deleteSqlQuery: `
        delete from phrase_word
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = phrase_word.phrase_id
        )
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "gloss",
    readSqlQuery: `
        select * from gloss
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = gloss.phrase_id
        )
      `,
    deleteSqlQuery: `
        delete from gloss
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = gloss.phrase_id
        )
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "gloss_history",
    readSqlQuery: `
        select * from gloss_history
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = gloss_history.phrase_id
        )
      `,
    deleteSqlQuery: `
        delete from gloss_history
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = gloss_history.phrase_id
        )
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "footnote",
    readSqlQuery: `
        select * from footnote
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = footnote.phrase_id
        )
      `,
    deleteSqlQuery: `
        delete from footnote
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = footnote.phrase_id
        )
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "translator_note",
    readSqlQuery: `
        select * from translator_note
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = translator_note.phrase_id
        )
      `,
    deleteSqlQuery: `
        delete from translator_note
        where exists (
          select 1 from phrase
          where language_id = $1
            and phrase.id = translator_note.phrase_id
        )
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "lemma_form_suggestion",
    readSqlQuery: `
        select * from lemma_form_suggestion
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from lemma_form_suggestion
        where language_id = $1
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "machine_gloss",
    readSqlQuery: `
        select * from machine_gloss
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from machine_gloss
        where language_id = $1
      `,
  }),
];
