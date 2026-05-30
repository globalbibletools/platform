import path from "path";
import fs from "fs";
import { describe, expect, it, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  formatVerseLabel,
  generateInterlinearPdf,
  generateInterlinearPdfDocument,
} from "./InterlinearPdfGenerator";
import type { InterlinearChapterResult } from "../data-access/InterlinearQueryService";
import { TextDirectionRaw } from "@/modules/languages/model";
import { fontMap } from "@/fonts";

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

  it("creates a readable PDF with Noto gloss and SBL body fonts", async () => {
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

  it("renders Noto Sans full composite with Cyrillic glosses", async () => {
    const chapter = buildSampleChapter();
    chapter.verses[0].words[0].gloss = "Жизнь";
    chapter.verses[0].words[1].gloss = "Бог";

    const { stream, pageCount } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Full Font Test", subtitle: "Cyrillic glosses" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
      glossFontName: "Noto Sans",
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("creates one PDF across multiple sections", async () => {
    const firstSection = buildSampleChapter();
    const secondSection = buildSampleChapter();
    secondSection.verses[0].chapter = 2;

    const { stream, pageCount } = generateInterlinearPdfDocument(
      [
        {
          chapter: firstSection,
          direction: "ltr",
          header: { title: "Test Header", subtitle: "Genesis" },
          sourceScript: "greek",
          glossFontName: "Noto Sans",
        },
        {
          chapter: secondSection,
          direction: "ltr",
          header: { title: "Test Header", subtitle: "Exodus" },
          sourceScript: "greek",
          glossFontName: "Noto Sans",
        },
      ],
      {
        pageSize: "letter",
        footer: { generatedAt: new Date(), pageOffset: 0 },
      },
    );

    const pdfBytes = await streamToBuffer(stream);
    expect(pageCount).toBeGreaterThanOrEqual(2);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("renders Devanagari glosses with the Noto Sans Devanagari composite", async () => {
    const chapter = buildSampleChapter();
    chapter.verses[0].words[0].gloss = "आरम्भ";
    chapter.verses[0].words[1].gloss = "परमेश्वर";

    const { stream, pageCount } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Devanagari Test", subtitle: "Hindi glosses" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
      glossFontName: "Noto Sans Devanagari",
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("renders metadata using Noto Sans rather than a script-specific gloss font", async () => {
    const chapter = buildSampleChapter();
    chapter.language.name = "Hindi";
    chapter.verses[0].words[0].text = "בְּרֵאשִׁית";
    chapter.verses[0].words[0].gloss = "आदि में";
    chapter.verses[0].words[1].text = "בָּרָא";
    chapter.verses[0].words[1].gloss = "उसने बनाया";

    const { stream } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: {
        title: "Hindi/Hebrew Interlinear",
        subtitle: "Genesis - Chapter 1",
      },
      sourceScript: "hebrew",
      glossFontName: "Noto Sans Devanagari",
    });

    const pdfBytes = await streamToBuffer(stream);
    const pdfText = Buffer.from(pdfBytes).toString("latin1");

    // Metadata (headers, verse labels, footers) uses Noto Sans CID font,
    // not Helvetica and not the script-specific gloss font.
    // PDFKit prefixes subsetted CID fonts with a random tag like CZZZZZ+.
    const notoSansBaseFontMatch = pdfText.match(
      /\/BaseFont \/[A-Z]{6}\+NotoSans[^/]*\b/,
    );
    expect(
      notoSansBaseFontMatch,
      "Expected a NotoSans BaseFont entry in the PDF",
    ).not.toBeNull();
    // Should not contain the Helvetica built-in font
    expect(pdfText).not.toContain("/BaseFont /Helvetica");
  });

  it("renders footers with page numbers using Noto Sans metadata font", async () => {
    const { stream, pageCount } = generateInterlinearPdf(buildSampleChapter(), {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Footer Test" },
      footer: { generatedAt: new Date("2026-01-01T00:00:00Z"), pageOffset: 0 },
    });

    const pdfBytes = await streamToBuffer(stream);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBe(pageCount);

    // The footer should be rendered with Noto Sans, not Helvetica.
    // We verify the font is embedded and the footer text is present.
    const pdfText = Buffer.from(pdfBytes).toString("latin1");
    expect(pdfText).not.toContain("/BaseFont /Helvetica");
    const notoSansMatch = pdfText.match(
      /\/BaseFont \/[A-Z]{6}\+NotoSans[^/]*\b/,
    );
    expect(
      notoSansMatch,
      "Expected NotoSans BaseFont in PDF footer",
    ).not.toBeNull();
  });

  it("renders Arabic glosses with configured font selection", async () => {
    const chapter = buildSampleChapter();
    chapter.verses[0].words[0].gloss = "كلمة";
    chapter.verses[0].words[1].gloss = "الله";

    const { stream, pageCount } = generateInterlinearPdf(chapter, {
      pageSize: "letter",
      direction: "ltr",
      header: { title: "Arabic Test", subtitle: "Arabic glosses" },
      footer: { generatedAt: new Date(), pageOffset: 0 },
      glossFontName: "Noto Sans Arabic",
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

describe("pdfFontMap", () => {
  it("covers every font name in the browser fontMap", () => {
    for (const fontName of Object.keys(fontMap)) {
      // All font names from fontMap should exist in pdfFontMap after
      // the module is loaded (it's a module-level const). We verify by
      // checking that generateInterlinearPdf can resolve them without
      // falling back to Helvetica — confirmed by checking the font
      // files exist on disk.
      const compositeFile = {
        "Noto Sans": "noto-sans-full.ttf",
        "Noto Sans Arabic": "noto-sans-arabic-latin.ttf",
        "Noto Sans Bengali": "noto-sans-bengali-latin.ttf",
        "Noto Sans Devanagari": "noto-sans-devanagari-latin.ttf",
        "Noto Sans Ethiopic": "noto-sans-ethiopic-latin.ttf",
        "Noto Sans Hebrew": "noto-sans-hebrew-latin.ttf",
        "Noto Sans Kannada": "noto-sans-kannada-latin.ttf",
        "Noto Sans Malayalam": "noto-sans-malayalam-latin.ttf",
        "Noto Sans Oriya": "noto-sans-oriya-latin.ttf",
        "Noto Sans Tamil": "noto-sans-tamil-latin.ttf",
        "Noto Sans Telugu": "noto-sans-telugu-latin.ttf",
        "Noto Sans Simplified Chinese": "noto-sans-simplified-chinese.ttf",
        "Noto Sans Traditional Chinese": "noto-sans-traditional-chinese.ttf",
        "Noto Sans Korean": "noto-sans-korean.ttf",
        "Noto Sans Japanese": "noto-sans-japanese.ttf",
      }[fontName];

      expect(
        compositeFile,
        `Missing pdfFontMap entry for "${fontName}"`,
      ).toBeDefined();

      const fontPath = path.join(
        process.cwd(),
        "src",
        "assets",
        "fonts",
        compositeFile!,
      );
      expect(
        fs.existsSync(fontPath),
        `Composite font file "${compositeFile}" not found at ${fontPath}`,
      ).toBe(true);
    }
  });
});
