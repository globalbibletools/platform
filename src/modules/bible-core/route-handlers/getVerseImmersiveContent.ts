import { NextResponse } from "next/server";
import { getVerseImmseriveContentReadModel } from "../read-models/getVerseImmersiveContentReadModel";

export default async function handleGetLemmaResource(
  req: Request,
  { params }: { params: Promise<{ verseId: string }> },
) {
  const resource = await getVerseImmseriveContentReadModel(
    (await params).verseId,
  );

  return NextResponse.json(resource);
}
