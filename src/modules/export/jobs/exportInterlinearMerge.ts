import { PDFDocument } from "pdf-lib";
import exportStorageRepository from "@/modules/export/data-access/ExportStorageRepository";
import { Readable } from "stream";

export async function mergePdfs({
  environment,
  partKeys,
  targetKey,
}: {
  environment: "prod" | "local";
  partKeys: string[];
  targetKey: string;
}): Promise<{ uploaded: boolean; pages: number }> {
  const uniquePartKeys = Array.from(new Set(partKeys));
  const mergedPdf = await PDFDocument.create();
  let mergedPages = 0;

  for (const key of uniquePartKeys) {
    const bytes = await exportStorageRepository.fetchBuffer({
      environment,
      key,
    });
    if (!bytes || bytes.byteLength === 0) continue;
    const partPdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(
      partPdf,
      partPdf.getPageIndices(),
    );
    copiedPages.forEach((p) => mergedPdf.addPage(p));
    mergedPages += copiedPages.length;
  }

  if (mergedPages === 0) {
    return { uploaded: false, pages: 0 };
  }

  const mergedBytes = await mergedPdf.save();
  await exportStorageRepository.uploadPdf({
    environment,
    key: targetKey,
    stream: Readable.from([mergedBytes]),
  });

  return { uploaded: true, pages: mergedPages };
}

export default mergePdfs;
