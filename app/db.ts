import pg, { QueryResult, QueryResultRow } from 'pg'
const { Pool } = pg

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
 
const pool = new Pool({ connectionString })

async function _query<T extends QueryResultRow>(client: pg.Pool | pg.PoolClient, text: string, params: any): Promise<QueryResult<T>> {
  const start = performance.now()
  const result = await client.query<T>(text, params)
  const duration = performance.now() - start
  if (process.env.LOG_DB_QUERIES === 'true') {
      console.log(`QUERY ${duration.toFixed(0)}ms ${text.replaceAll(/\s+/g, ' ').slice(0, 100)} params: ${JSON.stringify(params)}`)
  }
  return result
}

export async function query<T extends QueryResultRow>(text: string, params: any): Promise<QueryResult<T>> {
  return _query(pool, text, params)
}

export async function transaction<T>(tx: (q: typeof query) => Promise<T>): Promise<T> {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        const result = await tx((text: string, params: any) => _query(client, text, params))
        await client.query('COMMIT')
        return result
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
