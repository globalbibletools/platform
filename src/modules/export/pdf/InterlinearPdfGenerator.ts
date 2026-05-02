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

/**
 * Maps language font names to PDF-safe fontsource asset filenames.
 * "Noto Sans" is the default for most languages; the PDF generator
 * will detect the gloss script and pick a more specific variant when needed.
 */
const pdfFontMap: Record<string, string> = {
  "Noto Sans": "noto-sans-latin-400-normal.woff",
  "Noto Sans Arabic": "noto-sans-arabic-arabic-400-normal.woff",
  "Noto Sans Devanagari": "noto-sans-devanagari-400-normal.woff",
};

const fontsourceCandidates: Record<string, string> = {
  "noto-sans-latin-400-normal.woff": path.join(
    "node_modules",
    "@fontsource",
    "noto-sans",
    "files",
    "noto-sans-latin-400-normal.woff",
  ),
  "noto-sans-arabic-arabic-400-normal.woff": path.join(
    "node_modules",
    "@fontsource",
    "noto-sans-arabic",
    "files",
    "noto-sans-arabic-arabic-400-normal.woff",
  ),
  "noto-sans-devanagari-400-normal.woff": path.join(
    "node_modules",
    "@fontsource",
    "noto-sans",
    "files",
    "noto-sans-devanagari-400-normal.woff",
  ),
};

/** Maps Unicode ranges to Noto font variants for "Noto Sans" fallback. */
const notoScriptVariants: { regex: RegExp; font: string }[] = [
  { regex: /[\u0900-\u097F]/, font: "Noto Sans Devanagari" },
  { regex: /[\u0600-\u06FF]/, font: "Noto Sans Arabic" },
];

const metadataFont = "Helvetica";

/**
 * Given a sample of gloss text and the language font name,
 * resolves the best font name to use in the PDF.
 */
function resolveGlossFontName(fontName: string, glossSample: string): string {
  if (fontName !== "Noto Sans") return fontName;
  for (const variant of notoScriptVariants) {
    if (variant.regex.test(glossSample)) return variant.font;
  }
  return fontName;
}

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
  const needsBufferedPages =
    typeof options.footer?.pageTotal === "number" &&
    Number.isFinite(options.footer.pageTotal);

  const doc = new PDFDocument({
    size: options.pageSize ?? "letter",
    margin: 56,
    bufferPages: needsBufferedPages,
  });

  const hebrewFont = fs.readFileSync(resolveRequiredFontFile("SBL_Hbrw.ttf"));
  const greekFont = fs.readFileSync(resolveRequiredFontFile("SBL_grk.ttf"));
  doc.registerFont("SBLHebrew", hebrewFont);
  doc.registerFont("SBLGreek", greekFont);
  const registeredFonts = new Set(["SBLHebrew", "SBLGreek"]);
  const stream = doc as unknown as Readable;

  let pageCount = 1;
  if (!needsBufferedPages) {
    renderFooter(doc, 1, options.footer);
    doc.on("pageAdded", () => {
      pageCount += 1;
      renderFooter(doc, pageCount, options.footer);
    });
  }

  sections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage();
    }
    renderSection(doc, section, registeredFonts);
  });

  if (needsBufferedPages) {
    pageCount = addFooter(doc, options.footer);
  }
  doc.end();
  return { stream, pageCount };
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
    section.chapter,
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
  chapter: InterlinearChapterResult,
  configuredFontName: string,
  registeredFonts: Set<string>,
) {
  const glossSample = chapter.verses
    .flatMap((v) => v.words.map((w) => w.gloss ?? ""))
    .join("");
  const resolvedFontName = resolveGlossFontName(
    configuredFontName,
    glossSample,
  );
  const glossFontFile = pdfFontMap[resolvedFontName];
  if (!glossFontFile) return "Helvetica";

  if (!registeredFonts.has(resolvedFontName)) {
    const fontData = fs.readFileSync(resolveRequiredFontFile(glossFontFile));
    doc.registerFont(resolvedFontName, fontData);
    registeredFonts.add(resolvedFontName);
  }

  return resolvedFontName;
}

function resolveRequiredFontFile(filename: string): string {
  const candidates = [
    "/var/task/fonts",
    path.join(process.cwd(), "fonts"),
    path.join(process.cwd(), "dist", "fonts"),
    path.join(process.cwd(), "src", "fonts"),
  ].map((fontBase) => path.join(fontBase, filename));

  const fontsourcePath = fontsourceCandidates[filename];
  if (fontsourcePath) {
    candidates.push(path.join(process.cwd(), fontsourcePath));
  }

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
    const y = doc.page.height - doc.page.margins.bottom - 10;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageNumber = pageOffset + i + 1;
    const pageLabel =
      footer?.pageTotal ?
        `Page ${pageNumber} of ${footer.pageTotal}`
      : `Page ${pageNumber}`;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555")
      .text(pageLabel, doc.page.margins.left, y, {
        width,
        lineBreak: false,
        align: "center",
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
        },
      );
    }
    doc.fillColor("#000");
  }
  return pageRange.count;
}

function renderFooter(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  footer?: { generatedAt?: Date; pageOffset?: number; pageTotal?: number },
) {
  const pageOffset = footer?.pageOffset ?? 0;
  const pageLabel =
    footer?.pageTotal ?
      `Page ${pageOffset + pageNumber} of ${footer.pageTotal}`
    : `Page ${pageOffset + pageNumber}`;
  const y = doc.page.height - doc.page.margins.bottom - 10;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const previousX = doc.x;
  const previousY = doc.y;

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#555")
    .text(pageLabel, doc.page.margins.left, y, {
      width,
      lineBreak: false,
      align: "center",
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
      },
    );
  }
  doc.fillColor("#000");

  doc.x = previousX;
  doc.y = previousY;
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
