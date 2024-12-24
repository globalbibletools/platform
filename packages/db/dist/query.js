import { Pool } from 'pg';
import Cursor from 'pg-cursor';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
const pool = new Pool({ connectionString, max: 20 });
export async function query(text, params) {
    return pool.query(text, params);
}
export async function* queryCursor(text, params, batchSize = 1) {
    const client = await pool.connect();
    try {
        const cursor = client.query(new Cursor(text, params));
        let size = 0;
        do {
            const rows = await cursor.read(batchSize);
            size = rows.length;
            for (const row of rows) {
                yield row;
            }
        } while (size > 0);
    }
    finally {
        client.release();
    }
}
export async function transaction(tx) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await tx((text, params) => client.query(text, params));
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function close() {
    await pool.end();
}
