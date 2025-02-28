import { NextResponse } from "next/server";
import readingQueryService from "../data-access/ReadingQueryService";

export default async function handleGetLemmaResource(
  req: Request,
  { params }: { params: Promise<{ lemmaId: string }> },
) {
  const resource = await readingQueryService.fetchResourceForLemmaId(
    (await params).lemmaId,
  );

  return NextResponse.json(resource);
}
