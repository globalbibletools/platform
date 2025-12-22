import { mergePdfs } from "./exportInterlinearMerge";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import { Readable } from "stream";

const { mockFetchBuffer, mockUploadPdf } = vi.hoisted(() => {
  return {
    mockFetchBuffer: vi.fn(),
    mockUploadPdf: vi.fn(),
  };
});

vi.mock("@/modules/export/data-access/ExportStorageRepository", () => {
  const repo = {
    fetchBuffer: mockFetchBuffer,
    uploadPdf: mockUploadPdf,
    deleteObject: vi.fn(),
    presignPdf: vi.fn(),
    bucketName: vi.fn(),
  };
  return { __esModule: true, exportStorageRepository: repo, default: repo };
});

describe("mergePdfs", () => {
  beforeEach(() => {
    mockFetchBuffer.mockReset();
    mockUploadPdf.mockReset();
  });

  it("merges available parts in order", async () => {
    const partOne = await createPdfWithPages(1);
    const partTwo = await createPdfWithPages(2);
    mockFetchBuffer
      .mockResolvedValueOnce(partOne)
      .mockResolvedValueOnce(partTwo);

    let uploadedBytes: Uint8Array | undefined;
    mockUploadPdf.mockImplementation(async ({ stream }) => {
      uploadedBytes = await streamToBuffer(stream as Readable);
      return "s3://bucket/final.pdf";
    });

    const result = await mergePdfs({
      environment: "local",
      partKeys: ["part-a.pdf", "part-b.pdf"],
      targetKey: "final.pdf",
    });

    expect(result).toEqual({ uploaded: true, pages: 3 });
    expect(mockUploadPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "local",
        key: "final.pdf",
      }),
    );
    expect(mockFetchBuffer).toHaveBeenCalledTimes(2);
    expect(uploadedBytes).toBeDefined();

    const merged = await PDFDocument.load(uploadedBytes!);
    expect(merged.getPageCount()).toBe(3);
  });

  it("skips missing parts without uploading", async () => {
    mockFetchBuffer.mockResolvedValueOnce(undefined);

    const result = await mergePdfs({
      environment: "local",
      partKeys: ["missing.pdf"],
      targetKey: "final.pdf",
    });

    expect(result).toEqual({ uploaded: false, pages: 0 });
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });

  it("deduplicates repeated part keys while preserving order", async () => {
    const partOne = await createPdfWithPages(1);
    const partTwo = await createPdfWithPages(1);
    mockFetchBuffer
      .mockResolvedValueOnce(partOne)
      .mockResolvedValueOnce(partTwo);

    const result = await mergePdfs({
      environment: "local",
      partKeys: ["part-a.pdf", "part-a.pdf", "part-b.pdf", "part-a.pdf"],
      targetKey: "final.pdf",
    });

    expect(result).toEqual({ uploaded: true, pages: 2 });
    expect(mockFetchBuffer).toHaveBeenCalledTimes(2);
    expect(mockFetchBuffer.mock.calls[0][0]).toEqual(
      expect.objectContaining({ key: "part-a.pdf" }),
    );
    expect(mockFetchBuffer.mock.calls[1][0]).toEqual(
      expect.objectContaining({ key: "part-b.pdf" }),
    );
  });
});

async function createPdfWithPages(count: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    pdf.addPage();
  }
  const bytes = await pdf.save();
  return bytes;
}

async function streamToBuffer(stream: Readable): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) {
    parts.push(chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk));
  }
  const merged = new Uint8Array(
    parts.reduce((sum, p) => sum + p.byteLength, 0),
  );
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}
