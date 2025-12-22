import path from "path";
import { describe, expect, it, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateInterlinearPdf } from "./InterlinearPdfGenerator";
import type { InterlinearChapterResult } from "../data-access/InterlinearQueryService";
import { TextDirectionRaw } from "@/modules/languages/model";

async function streamToBuffer(
  stream: NodeJS.ReadableStream,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) {
    if (chunk instanceof Uint8Array) {
      parts.push(chunk);
    } else if (Buffer.isBuffer(chunk)) {
      parts.push(
        new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
      );
    } else if (typeof chunk === "string") {
      parts.push(new Uint8Array(Buffer.from(chunk)));
    }
  }
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

function buildSampleChapter(): InterlinearChapterResult {
  return {
    language: {
      id: "lang-1",
      code: "en",
      name: "Test Language",
      textDirection: TextDirectionRaw.LTR,
    },
    verses: [
      {
        id: "verse-1",
        number: 1,
        words: [
          {
            id: "w1",
            text: "λόγος",
            gloss: "word",
            lemma: "logos",
            grammar: "N-NSM",
          },
          {
            id: "w2",
            text: "θεοῦ",
            gloss: "of God",
            lemma: "theos",
            grammar: "N-GSM",
          },
        ],
      },
    ],
  };
}

describe("generateInterlinearPdf", () => {
  beforeEach(() => {
    process.env.PDFKIT_DATA_DIR = path.join(
      process.cwd(),
      "node_modules",
      "pdfkit",
      "js",
      "data",
    );
  });

  it("creates a readable PDF with Helvetica gloss and SBL body fonts", async () => {
    const { stream, pageCount } = generateInterlinearPdf(buildSampleChapter(), {
      layout: "standard",
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Test Header", subtitle: "Book 1" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
