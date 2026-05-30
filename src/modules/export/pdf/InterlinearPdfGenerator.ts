import PDFDocument from "pdfkit";
import { Readable } from "stream";
import {
  InterlinearChapterResult,
  InterlinearVerse,
} from "../data-access/InterlinearQueryService";
import path from "path";
import fs from "fs";

export interface PdfGeneratorOptions {
  pageSize?: "letter" | "a4";
  direction?: "ltr" | "rtl";
  header?: { title?: string; subtitle?: string };
  footer?: { generatedAt?: Date; pageOffset?: number; pageTotal?: number };
  sourceScript?: "hebrew" | "greek";
  glossFontName?: string;
}

export interface InterlinearPdfSection {
  chapter: InterlinearChapterResult;
  direction?: "ltr" | "rtl";
  header?: { title?: string; subtitle?: string };
  sourceScript?: "hebrew" | "greek";
  glossFontName?: string;
}

const pdfFontMap: Record<string, string> = {
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
};

const metadataFont = "Noto Sans";

export interface GeneratedPdf {
  stream: Readable;
  pageCount: number;
}

export function generateInterlinearPdf(
  chapter: InterlinearChapterResult,
  options: PdfGeneratorOptions,
): GeneratedPdf {
  return generateInterlinearPdfDocument(
    [
      {
        chapter,
        direction: options.direction,
        header: options.header,
        sourceScript: options.sourceScript,
        glossFontName: options.glossFontName,
      },
    ],
    {
      pageSize: options.pageSize,
      footer: options.footer,
    },
  );
}

export function generateInterlinearPdfDocument(
  sections: readonly InterlinearPdfSection[],
  options: Pick<PdfGeneratorOptions, "pageSize" | "footer">,
): GeneratedPdf {
  // Always buffer pages so footers are rendered in a separate pass.
  // This avoids infinite recursion when using embedded CID fonts,
  // since rendering a footer during the pageAdded event can trigger
  // continueOnNewPage in PDFKit.
  const doc = new PDFDocument({
    size: options.pageSize ?? "letter",
    margin: 56,
    bufferPages: true,
  });

  const hebrewFont = fs.readFileSync(resolveRequiredFontFile("SBL_Hbrw.ttf"));
  const greekFont = fs.readFileSync(resolveRequiredFontFile("SBL_grk.ttf"));
  const notoSansFont = fs.readFileSync(
    resolveRequiredFontFile(pdfFontMap["Noto Sans"]!),
  );
  doc.registerFont("SBLHebrew", hebrewFont);
  doc.registerFont("SBLGreek", greekFont);
  doc.registerFont(metadataFont, notoSansFont);
  const registeredFonts = new Set(["SBLHebrew", "SBLGreek", metadataFont]);

  sections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage();
    }
    renderSection(doc, section, registeredFonts);
  });

  const pageCount = addFooter(doc, options.footer);
  doc.end();
  return { stream: doc as unknown as Readable, pageCount };
}

function renderSection(
  doc: PDFKit.PDFDocument,
  section: InterlinearPdfSection,
  registeredFonts: Set<string>,
) {
  const normalizedDirection =
    (section.direction ?? "ltr").toLowerCase() === "rtl" ? "rtl" : "ltr";
  const glossFont = registerGlossFont(
    doc,
    section.glossFontName ?? "Noto Sans",
    registeredFonts,
  );
  const primaryFont =
    section.sourceScript === "hebrew" ? "SBLHebrew"
    : section.sourceScript === "greek" ? "SBLGreek"
    : normalizedDirection === "rtl" ? "SBLHebrew"
    : "SBLGreek";
  const alignment =
    section.sourceScript === "hebrew" || normalizedDirection === "rtl" ?
      "right"
    : "left";

  renderHeader(doc, section.header, alignment);

  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const verseSpacing = 0.5;

  for (const verse of section.chapter.verses) {
    ensureSpace(doc, 40);
    renderVerse(doc, verse, primaryFont, glossFont, alignment, contentWidth);
    doc.moveDown(verseSpacing);
  }
}

function registerGlossFont(
  doc: PDFKit.PDFDocument,
  configuredFontName: string,
  registeredFonts: Set<string>,
) {
  const glossFontFile = pdfFontMap[configuredFontName];
  if (!glossFontFile) return "Helvetica";

  if (!registeredFonts.has(configuredFontName)) {
    const fontData = fs.readFileSync(resolveRequiredFontFile(glossFontFile));
    doc.registerFont(configuredFontName, fontData);
    registeredFonts.add(configuredFontName);
  }

  return configuredFontName;
}

function resolveRequiredFontFile(filename: string): string {
  const candidates = [
    "/var/task/fonts",
    path.join(process.cwd(), "src", "assets", "fonts"),
  ].map((fontBase) => path.join(fontBase, filename));

  const fontPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!fontPath) {
    throw new Error(
      `Font ${filename} not found. Tried: ${candidates.join(", ")}`,
    );
  }

  return fontPath;
}

function renderVerse(
  doc: PDFKit.PDFDocument,
  verse: InterlinearVerse,
  font: string,
  glossFont: string,
  alignment: "left" | "right",
  contentWidth: number,
) {
  doc
    .font(metadataFont)
    .fontSize(10)
    .fillColor("#444")
    .text(formatVerseLabel(verse), {
      continued: false,
      underline: true,
      align: alignment,
    })
    .fillColor("#000");
  doc.moveDown(0.2);

  renderInterlinearLine(
    doc,
    verse.words,
    font,
    glossFont,
    alignment,
    contentWidth,
  );
}

export function formatVerseLabel(verse: InterlinearVerse): string {
  return `${verse.chapter}:${verse.number}`;
}

function renderInterlinearLine(
  doc: PDFKit.PDFDocument,
  words: InterlinearVerse["words"],
  primaryFont: string,
  glossFont: string,
  alignment: "left" | "right",
  contentWidth: number,
) {
  const glossFontSize = 12;
  const primaryFontSize = 24;
  const columnPadding = 12;
  const orderedWords = alignment === "right" ? [...words].reverse() : words;

  type WordColumn = {
    word: InterlinearVerse["words"][number];
    gloss: string;
    columnWidth: number;
  };

  const measuredWords: WordColumn[] = orderedWords.map((word) => {
    const gloss = formatGloss(word);
    doc.font(glossFont).fontSize(glossFontSize);
    const glossWidth = gloss ? doc.widthOfString(gloss) : 0;
    doc.font(primaryFont).fontSize(primaryFontSize);
    const primaryWidth = doc.widthOfString(word.text);
    const columnWidth = Math.min(
      Math.max(glossWidth, primaryWidth) + columnPadding,
      contentWidth,
    );

    return { word, gloss, columnWidth };
  });

  const lines: WordColumn[][] = [];
  let currentLine: WordColumn[] = [];
  let currentWidth = 0;

  for (const item of measuredWords) {
    const nextWidth = currentWidth + item.columnWidth;
    if (currentLine.length > 0 && nextWidth > contentWidth) {
      lines.push(currentLine);
      currentLine = [item];
      currentWidth = item.columnWidth;
    } else {
      currentLine.push(item);
      currentWidth = nextWidth;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  for (const line of lines) {
    const lineWidth = line.reduce((sum, item) => sum + item.columnWidth, 0);
    const startX =
      alignment === "right" ?
        doc.page.width - doc.page.margins.right - lineWidth
      : doc.page.margins.left;

    const primaryHeights = line.map((item) => {
      doc.font(primaryFont).fontSize(primaryFontSize);
      return doc.heightOfString(item.word.text, {
        width: item.columnWidth,
        align: "center",
      });
    });
    const maxPrimaryHeight =
      primaryHeights.length ? Math.max(...primaryHeights) : 0;

    const glossHeights = line.map((item) => {
      doc.font(glossFont).fontSize(glossFontSize);
      return doc.heightOfString(item.gloss || " ", {
        width: item.columnWidth,
        align: "center",
      });
    });
    const maxGlossHeight = glossHeights.length ? Math.max(...glossHeights) : 0;

    const lineHeight = maxPrimaryHeight + maxGlossHeight + 12;
    ensureSpace(doc, lineHeight);

    const glossY = doc.y;
    const primaryY = glossY;
    const glossBelowY = primaryY + maxPrimaryHeight + 4;

    doc.fillColor("#000").font(primaryFont).fontSize(primaryFontSize);
    let cursorX = startX;
    for (const item of line) {
      doc.text(item.word.text, cursorX, primaryY, {
        width: item.columnWidth,
        align: "center",
      });
      cursorX += item.columnWidth;
    }

    doc.font(glossFont).fontSize(glossFontSize).fillColor("#444");
    cursorX = startX;
    for (const item of line) {
      if (item.gloss) {
        doc.text(item.gloss, cursorX, glossBelowY, {
          width: item.columnWidth,
          align: "center",
        });
      }
      cursorX += item.columnWidth;
    }

    doc.y = glossBelowY + maxGlossHeight + 6;
  }
}

function addFooter(
  doc: PDFKit.PDFDocument,
  footer?: { generatedAt?: Date; pageOffset?: number; pageTotal?: number },
) {
  const pageRange = doc.bufferedPageRange();
  const pageOffset = footer?.pageOffset ?? 0;
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    // Reset the y cursor to prevent PDFKit from thinking we're past
    // the bottom margin, which would trigger a page break when rendering
    // footer text with an embedded CID font.
    doc.y = doc.page.margins.top;
    const y = doc.page.height - doc.page.margins.bottom - 10;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageNumber = pageOffset + i + 1;
    const pageLabel =
      footer?.pageTotal ?
        `Page ${pageNumber} of ${footer.pageTotal}`
      : `Page ${pageNumber}`;
    doc
      .font(metadataFont)
      .fontSize(8)
      .fillColor("#555")
      .text(pageLabel, doc.page.margins.left, y, {
        width,
        lineBreak: false,
        align: "center",
        height: 10,
      });
    if (footer?.generatedAt) {
      doc.text(
        `Generated: ${footer.generatedAt.toISOString()}`,
        doc.page.margins.left,
        y,
        {
          width,
          lineBreak: false,
          align: "right",
          height: 10,
        },
      );
    }
    doc.fillColor("#000");
  }
  return pageRange.count;
}

function renderHeader(
  doc: PDFKit.PDFDocument,
  header: PdfGeneratorOptions["header"],
  alignment: "left" | "right",
) {
  const headerTitle = header?.title ?? "Interlinear export";
  const headerSubtitle = header?.subtitle ?? "";
  doc.font(metadataFont).fontSize(14).text(headerTitle, { align: "center" });
  if (headerSubtitle) {
    doc
      .font(metadataFont)
      .fontSize(10)
      .fillColor("#555")
      .text(headerSubtitle, { align: alignment })
      .fillColor("#000");
  }
  doc.moveDown();
}

function ensureSpace(doc: PDFKit.PDFDocument, required: number) {
  const available = doc.page.height - doc.page.margins.bottom - doc.y - 10; // padding
  if (required > available) {
    doc.addPage();
  }
}

function formatGloss(word: InterlinearVerse["words"][number]) {
  const parts = [word.gloss].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}
