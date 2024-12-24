import pg, { type QueryResult, type QueryResultRow } from 'pg'
import Cursor from 'pg-cursor'

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
 
const pool = new pg.Pool({ connectionString, max: 20 })

export async function query<T extends QueryResultRow>(text: string, params: any): Promise<QueryResult<T>> {
  return pool.query(text, params)
}

export async function *queryCursor<T extends QueryResultRow>(text: string, params: any, batchSize = 1): AsyncGenerator<T> {
    const client = await pool.connect()
    try {
        const cursor = client.query(new Cursor<T>(text, params))

        let size = 0
        do {
            const rows = await cursor.read(batchSize)
            size = rows.length

            for (const row of rows) {
                yield row
            }
        } while (size > 0)
    } finally {
        client.release()
    }
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
