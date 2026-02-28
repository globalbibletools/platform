import pg, { type QueryResult, type QueryResultRow } from "pg";
import QueryStream from "pg-query-stream";
import { from as copyFrom } from "pg-copy-streams";
import { logger } from "./logging";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { vitest, Mock, MockedObject } from "vitest";

import {
  LanguageMemberTable,
  LanguageProgressView,
  LanguageTable,
} from "@/modules/languages/db/schema";
import { Generated, Kysely, PostgresDialect, Transaction } from "kysely";
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
  LemmaTable,
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
  MachineGlossTable,
  PhraseTable,
  PhraseWordTable,
  TranslatorNoteTable,
} from "./modules/translation/db/schema";
import { JobTable } from "./shared/jobs/db/schema";
import { TrackingEventTable } from "./modules/reporting/db/schema";

export interface Database {
  book: BookTable;
  footnote: FootnoteTable;
  gloss: GlossTable;
  gloss_history: GlossHistoryTable;
  job: JobTable;
  language: LanguageTable;
  language_member: LanguageMemberTable;
  language_progress: LanguageProgressView;
  lemma: LemmaTable;
  lemma_form: LemmaFormTable;
  lemma_resource: LemmaResourceTable;
  machine_gloss: MachineGlossTable;
  phrase: PhraseTable;
  phrase_word: PhraseWordTable;
  reset_password_token: ResetPasswordTokenTable;
  session: SessionTable;
  tracking_event: TrackingEventTable;
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

export async function unitOfWork<T>(
  work: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return getDb()
    .transaction()
    .execute(async (trx) => work(trx));
}

export async function close() {
  await _pool?.end();
}

export async function reconnect() {
  try {
    await _pool?.end();
  } catch {}

  _db = undefined;
  _pool = undefined;
}

export async function copyStreamV2<
  Record = unknown,
  Table extends keyof Database = keyof Database,
>({
  table,
  stream,
  fields,
}: {
  table: Table;
  stream: Readable;
  fields: FieldMappers<Record, Database[Table]>;
}): Promise<void> {
  const fieldArray = Object.entries<FieldMapper<Record>>(fields);
  const fieldQuery = fieldArray.map(([name]) => name).join(",");
  const transform = new PostgresTextFormatTransform(
    fieldArray.map(([, mapper]) => mapper),
  );

  const client = await getPool().connect();
  try {
    const dbStream = client.query(
      copyFrom(`copy ${table}(${fieldQuery}) from stdin`),
    );
    await pipeline(stream, transform, dbStream);
  } finally {
    client.release();
  }
}

export type FieldMapper<T> = (record: T) => string;

type IsGenerated<T> = T extends Generated<any> ? true : false;
type FieldMappers<Record, Table> = {
  [K in keyof Table as IsGenerated<Table[K]> extends true ? K
  : never]?: FieldMapper<Record>;
} & {
  [K in keyof Table as IsGenerated<Table[K]> extends false ? K
  : never]: FieldMapper<Record>;
};

class PostgresTextFormatTransform extends Transform {
  constructor(private fieldMappers: FieldMapper<any>[]) {
    super({
      writableObjectMode: true,
    });
  }

  override _transform(
    chunk: any,
    _encoding: string,
    cb: (err?: Error) => void,
  ) {
    chunk = Array.isArray(chunk) ? chunk : [chunk];

    for (const record of chunk) {
      for (let i = 0; i < this.fieldMappers.length; i++) {
        this.push(this.fieldMappers[i](record) ?? "\\N");

        if (i < this.fieldMappers.length - 1) {
          this.push("\t");
        }
      }

      this.push("\n");
    }

    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    this.push("\\.\n");
    cb();
  }
}
