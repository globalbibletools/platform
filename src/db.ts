import pg, { type QueryResult, type QueryResultRow } from "pg";
import QueryStream from "pg-query-stream";
import { from as copyFrom } from "pg-copy-streams";
import { logger } from "./logging";
import { Readable } from "stream";

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

  const dbStream = client.query(copyFrom(`copy ${table} from stdin`));

  try {
    await new Promise<void>((resolve, reject) => {
      stream.on("error", (err) => {
        reject(err);
      });
      dbStream.on("error", (err) => {
        reject(err);
      });
      dbStream.on("end", () => {
        resolve();
      });

      stream.pipe(dbStream);
    });
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
}
