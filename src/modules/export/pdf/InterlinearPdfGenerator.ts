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
  layout: "standard" | "parallel";
  direction?: "ltr" | "rtl";
  header?: { title?: string; subtitle?: string };
  footer?: { generatedAt?: Date; pageOffset?: number; pageTotal?: number };
  sourceScript?: "hebrew" | "greek";
}

export interface GeneratedPdf {
  stream: Readable;
  pageCount: number;
}

export function generateInterlinearPdf(
  chapter: InterlinearChapterResult,
  options: PdfGeneratorOptions,
): GeneratedPdf {
  const normalizedDirection =
    (options.direction ?? "ltr").toLowerCase() === "rtl" ? "rtl" : "ltr";
  // Resolve fonts packaged with the worker bundle; fallback to local src/fonts for dev
  const fontCandidates = [
    "/var/task/fonts",
    path.join(process.cwd(), "fonts"),
    path.join(__dirname, "fonts"),
    path.join(process.cwd(), "dist", "fonts"),
    path.join(process.cwd(), "src", "fonts"),
  ];
  const fontBase = fontCandidates.find((p) => fs.existsSync(p));
  if (!fontBase) {
    throw new Error(
      `Font directory not found. Tried: ${fontCandidates.join(", ")}`,
    );
  }
  const hebrewFontPath = path.join(fontBase, "SBL_Hbrw.ttf");
  const greekFontPath = path.join(fontBase, "SBL_grk.ttf");
  if (!fs.existsSync(hebrewFontPath) || !fs.existsSync(greekFontPath)) {
    throw new Error(
      `SBL fonts not found. Expected at ${hebrewFontPath} and ${greekFontPath}`,
    );
  }

  const needsBufferedPages =
    typeof options.footer?.pageTotal === "number" &&
    Number.isFinite(options.footer.pageTotal);

  const doc = new PDFDocument({
    size: options.pageSize ?? "letter",
    margin: 56,
    bufferPages: needsBufferedPages,
  });

  const hebrewFont = fs.readFileSync(path.join(fontBase, "SBL_Hbrw.ttf"));
  const greekFont = fs.readFileSync(path.join(fontBase, "SBL_grk.ttf"));
  doc.registerFont("SBLHebrew", hebrewFont);
  doc.registerFont("SBLGreek", greekFont);
  const primaryFont =
    options.sourceScript === "hebrew" ? "SBLHebrew"
    : options.sourceScript === "greek" ? "SBLGreek"
    : normalizedDirection === "rtl" ? "SBLHebrew"
    : "SBLGreek";
  const glossFont = "Helvetica";
  const alignment =
    options.sourceScript === "hebrew" || normalizedDirection === "rtl" ?
      "right"
    : "left";
  const stream = doc as unknown as Readable;

  let pageCount = 1;
  if (!needsBufferedPages) {
    renderFooter(doc, 1, options.footer);
    doc.on("pageAdded", () => {
      pageCount += 1;
      renderFooter(doc, pageCount, options.footer);
    });
  }

  renderHeader(doc, primaryFont, glossFont, options.header, alignment);

  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const verseSpacing = options.layout === "parallel" ? 1.2 : 0.5;

  for (const verse of chapter.verses) {
    ensureSpace(doc, 40);
    renderVerse(
      doc,
      verse,
      options.layout,
      primaryFont,
      glossFont,
      alignment,
      contentWidth,
    );
    doc.moveDown(verseSpacing);
  }

  if (needsBufferedPages) {
    pageCount = addFooter(doc, options.footer);
  }
  doc.end();
  return { stream, pageCount };
}

function renderVerse(
  doc: PDFKit.PDFDocument,
  verse: InterlinearVerse,
  layout: "standard" | "parallel",
  font: string,
  glossFont: string,
  alignment: "left" | "right",
  contentWidth: number,
) {
  doc
    .font(glossFont)
    .fontSize(10)
    .fillColor("#444")
    .text(`Verse ${verse.number}`, {
      continued: false,
      underline: true,
      align: alignment,
    })
    .fillColor("#000");
  doc.moveDown(0.2);

  if (layout === "standard") {
    renderInterlinearLine(
      doc,
      verse.words,
      font,
      glossFont,
      alignment,
      contentWidth,
    );
  } else {
    renderParallelVerse(doc, verse, font, glossFont, alignment, contentWidth);
  }
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

function renderParallelVerse(
  doc: PDFKit.PDFDocument,
  verse: InterlinearVerse,
  primaryFont: string,
  glossFont: string,
  alignment: "left" | "right",
  contentWidth: number,
) {
  const primaryFontSize = 22;
  const glossFontSize = 14;
  const columnGap = 32;
  const glossColumnWidth = contentWidth * 0.45;
  const primaryColumnWidth = contentWidth - glossColumnWidth - columnGap;

  const primaryText = verse.words
    .map((w) => w.text)
    .join(alignment === "right" ? "  " : " ");
  const glossText = verse.words
    .map((w) => formatParagraphDetail(w))
    .filter(Boolean)
    .join(" ");

  const estimatedHeight =
    doc.heightOfString(primaryText, {
      width: primaryColumnWidth,
      align: alignment,
    }) +
    doc.heightOfString(glossText, {
      width: glossColumnWidth,
      align: "left",
    }) +
    20;
  ensureSpace(doc, estimatedHeight);

  const startX = doc.page.margins.left;
  const glossX = startX;
  const primaryX = glossX + glossColumnWidth + columnGap;

  const primaryY = doc.y;
  doc
    .font(primaryFont)
    .fontSize(primaryFontSize)
    .fillColor("#000")
    .text(primaryText, primaryX, primaryY, {
      width: primaryColumnWidth,
      align: alignment,
    });

  const glossY = primaryY;
  doc
    .font(glossFont)
    .fontSize(glossFontSize)
    .fillColor("#444")
    .text(glossText, glossX, glossY, {
      width: glossColumnWidth,
      align: "left",
    });

  const primaryHeight = doc.heightOfString(primaryText, {
    width: primaryColumnWidth,
    align: alignment,
  });
  const glossHeight = doc.heightOfString(glossText, {
    width: glossColumnWidth,
    align: "left",
  });

  doc.y = Math.max(primaryY + primaryHeight, glossY + glossHeight) + 10;
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

  doc.fontSize(8).fillColor("#555").text(pageLabel, doc.page.margins.left, y, {
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
  primaryFont: string,
  glossFont: string,
  header: PdfGeneratorOptions["header"],
  alignment: "left" | "right",
) {
  const headerTitle = header?.title ?? "Interlinear export";
  const headerSubtitle = header?.subtitle ?? "";
  doc.font(primaryFont).fontSize(14).text(headerTitle, { align: "center" });
  if (headerSubtitle) {
    doc
      .font(glossFont)
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

function formatParagraphDetail(word: InterlinearVerse["words"][number]) {
  return word.gloss ? word.gloss : "";
}
