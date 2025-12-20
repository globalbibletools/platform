import pg, { type QueryResult, type QueryResultRow } from "pg";
import QueryStream from "pg-query-stream";
import { from as copyFrom } from "pg-copy-streams";
import { logger } from "./logging";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import {
  LanguageMemberTable,
  LanguageTable,
} from "@/modules/languages/data-access/types";
import { Kysely, PostgresDialect } from "kysely";
import {
  ResetPasswordTokenTable,
  SessionTable,
  UserEmailVerificationTable,
  UserInvitationTable,
  UserSystemRoleTable,
  UserTable,
} from "./modules/users/data-access/types";

export interface Database {
  language: LanguageTable;
  language_member: LanguageMemberTable;
  users: UserTable;
  reset_password_token: ResetPasswordTokenTable;
  user_email_verification: UserEmailVerificationTable;
  user_invitation: UserInvitationTable;
  user_system_role: UserSystemRoleTable;
  session: SessionTable;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env var missing");
}

// Convert BigInts to Javascript numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, function (val) {
  return parseInt(val, 10);
});

let pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

function onError(error: unknown) {
  logger.error(error);
}
pool.on("error", onError);

let db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export function getDb(): Kysely<Database> {
  return db;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: any,
): Promise<QueryResult<T>> {
  return pool.query(text, params);
}

export async function queryStream(
  text: string,
  params: any,
): Promise<QueryStream> {
  const client = await pool.connect();

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
  const client = await pool.connect();

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
  const client = await pool.connect();

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
  await pool.end();
}

export async function reconnect() {
  try {
    await pool.end();
  } catch (_) {}
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
  pool.on("error", onError);

  db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  });
}
