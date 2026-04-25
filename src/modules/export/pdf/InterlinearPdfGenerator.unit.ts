import path from "path";
import { describe, expect, it, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  formatVerseLabel,
  generateInterlinearPdf,
} from "./InterlinearPdfGenerator";
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
      font: "Noto Sans",
      textDirection: TextDirectionRaw.LTR,
    },
    verses: [
      {
        id: "verse-1",
        chapter: 1,
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

  it("renders Devanagari glosses with NotoSansDevanagari font", async () => {
    const chapter = buildSampleChapter();
    chapter.verses[0].words[0].gloss = "आरम्भ";
    chapter.verses[0].words[1].gloss = "परमेश्वर";

    const { stream, pageCount } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Devanagari Test", subtitle: "Hindi glosses" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
      glossFontName: "Noto Sans",
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ["configured", "Noto Sans Arabic"],
    ["detected", "Noto Sans"],
  ])("renders Arabic glosses with %s font selection", async (_, fontName) => {
    const chapter = buildSampleChapter();
    chapter.verses[0].words[0].gloss = "كلمة";
    chapter.verses[0].words[1].gloss = "الله";

    const { stream, pageCount } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Arabic Test", subtitle: "Arabic glosses" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
      glossFontName: fontName,
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("formats verse labels as chapter and verse references", () => {
    expect(
      formatVerseLabel({
        id: "verse-3-1",
        chapter: 3,
        number: 1,
        words: [],
      }),
    ).toBe("3:1");
  });
});
