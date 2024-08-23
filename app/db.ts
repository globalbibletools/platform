import pg, { QueryResult, QueryResultRow } from 'pg'
const { Pool } = pg

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
 
const pool = new Pool({ connectionString })
 
export function query<T extends QueryResultRow>(text: string, params: any): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export async function transaction(tx: (q: typeof query) => Promise<void>): Promise<void> {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        await tx(client.query.bind(client))
        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
