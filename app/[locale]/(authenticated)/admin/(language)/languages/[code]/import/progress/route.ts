import { NextRequest } from "next/server";
import { query } from "@/shared/db";

export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
    const job = await fetchImportJob(params.code)

    return Response.json({
        done: !job || typeof job.succeeded === 'boolean'
    })
}

async function fetchImportJob(code: string): Promise<{ succeeded: boolean } | undefined> {
    const jobQuery = await query<{ succeeded: boolean }>(
        `
        SELECT succeeded FROM "LanguageImportJob" AS j
        JOIN "Language" AS l ON l.id = j."languageId"
        WHERE l.code = $1
        `,
        [code]
    )
    return jobQuery.rows[0]
}
