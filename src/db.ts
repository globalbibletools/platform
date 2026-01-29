import pg, { type QueryResult, type QueryResultRow } from "pg";
import QueryStream from "pg-query-stream";
import { from as copyFrom } from "pg-copy-streams";
import { logger } from "./logging";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import {
  LanguageMemberTable,
  LanguageProgressView,
  LanguageTable,
} from "@/modules/languages/db/schema";
import { Kysely, PostgresDialect } from "kysely";
import {
  ResetPasswordTokenTable,
  SessionTable,
  UserEmailVerificationTable,
  UserInvitationTable,
  UserSystemRoleTable,
  UserTable,
} from "./modules/users/data-access/types";
import {
  BookTable,
  LemmaFormTable,
  LemmaResourceTable,
  VerseCommentaryTable,
  VerseQuestionTable,
  VerseTable,
  WordLexiconTable,
  WordTable,
} from "./modules/bible-core/db/schema";
import {
  FootnoteTable,
  GlossHistoryTable,
  GlossTable,
  PhraseTable,
  PhraseWordTable,
  TranslatorNoteTable,
} from "./modules/translation/db/schema";

export interface Database {
  book: BookTable;
  footnote: FootnoteTable;
  gloss: GlossTable;
  gloss_history: GlossHistoryTable;
  language: LanguageTable;
  language_member: LanguageMemberTable;
  language_progress: LanguageProgressView;
  lemma_form: LemmaFormTable;
  lemma_resource: LemmaResourceTable;
  phrase: PhraseTable;
  phrase_word: PhraseWordTable;
  reset_password_token: ResetPasswordTokenTable;
  session: SessionTable;
  translator_note: TranslatorNoteTable;
  user_email_verification: UserEmailVerificationTable;
  user_invitation: UserInvitationTable;
  user_system_role: UserSystemRoleTable;
  users: UserTable;
  verse: VerseTable;
  verse_commentary: VerseCommentaryTable;
  verse_question: VerseQuestionTable;
  word: WordTable;
  word_lexicon: WordLexiconTable;
}

// Convert BigInts to Javascript numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, function (val) {
  return parseInt(val, 10);
});

let _pool: pg.Pool | undefined;
export function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL env var missing");
    }

    _pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
    });
    _pool.on("error", (error) => logger.error(error));
  }
  return _pool;
}

let _db: Kysely<Database> | undefined;
export function getDb(): Kysely<Database> {
  if (!_db) {
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return _db;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: any,
): Promise<QueryResult<T>> {
  return getPool().query(text, params);
}

export async function queryStream(
  text: string,
  params: any,
): Promise<QueryStream> {
  const client = await getPool().connect();

  const query = new QueryStream(text, params);
  const stream = client.query(query);

  stream.on("end", () => {
    client.release();
  });

  return stream;
}

export async function copyStream(
  table: string,
  stream: Readable,
): Promise<void> {
  const client = await getPool().connect();

  try {
    const dbStream = client.query(copyFrom(`copy ${table} from stdin`));
    await pipeline(stream, dbStream);
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  tx: (q: typeof query) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await tx((text: string, params: any) =>
      client.query(text, params),
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function close() {
  await _pool?.end();
}

export async function reconnect() {
  try {
    await _pool?.end();
  } catch (_) {}

  _db = undefined;
  _pool = undefined;
}
