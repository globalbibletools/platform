import { NextRequest } from "next/server";
import { query } from "@/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  const job = await fetchImportJob(params.code);

  return Response.json({
    done: !job || typeof job.succeeded === "boolean",
  });
}

async function fetchImportJob(
  code: string,
): Promise<{ succeeded: boolean } | undefined> {
  const jobQuery = await query<{ succeeded: boolean }>(
    `
        SELECT succeeded FROM language_import_job AS j
        JOIN language AS l ON l.id = j.language_id
        WHERE l.code = $1
        `,
    [code],
  );
  return jobQuery.rows[0];
}
