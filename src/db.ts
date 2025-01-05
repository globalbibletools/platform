import pg, { type QueryResult, type QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
 
const pool = new pg.Pool({ connectionString, max: 20 })

export async function query<T extends QueryResultRow>(text: string, params: any): Promise<QueryResult<T>> {
  return pool.query(text, params)
}

export async function transaction<T>(tx: (q: typeof query) => Promise<T>): Promise<T> {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        const result = await tx((text: string, params: any) => client.query(text, params))
        await client.query('COMMIT')
        return result
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export async function close() {
    await pool.end()
}
