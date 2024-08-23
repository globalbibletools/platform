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

export async function transaction<T>(tx: (q: typeof query) => Promise<T>): Promise<T> {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        const result = await tx(client.query.bind(client))
        await client.query('COMMIT')
        return result
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
