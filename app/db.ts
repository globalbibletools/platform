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
