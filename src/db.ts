import pg, { type QueryResult, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env var missing");
}

let pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

let count = 0;
function error(error: unknown) {
  console.log("error", error);
}
function connect() {
  console.log(`connect, open: ${++count}`);
}
function remove() {
  console.log(`remove, open: ${--count}`);
}
pool.on("error", error);
pool.on("connect", connect);
pool.on("remove", remove);

export async function query<T extends QueryResultRow>(
  text: string,
  params: any,
): Promise<QueryResult<T>> {
  return pool.query(text, params);
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
  pool.on("connect", connect);
  pool.on("remove", remove);
  pool.on("error", error);
}
