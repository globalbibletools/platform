import { NextRequest } from "next/server";
import { fetchImportJob } from "../page";

export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
    const job = await fetchImportJob(params.code)

    return Response.json({
        done: !job || typeof job.succeeded === 'boolean'
    })
}
