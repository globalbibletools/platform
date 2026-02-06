import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { getJobStatusReadModel } from "../read-models/getJobStatusReadModel";

export async function handleGetJobStatus(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const jobStatus = await getJobStatusReadModel(jobId);

  return Response.json(jobStatus);
}
