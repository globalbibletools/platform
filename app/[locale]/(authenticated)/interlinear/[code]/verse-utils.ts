import { verseCounts } from "@/data/verse-counts";
import fuzzysort from "fuzzysort";

export interface VerseInfo {
    bookId: number,
    chapterNumber: number,
    verseNumber: number
}

export function decrementVerseId(verseId: string) {
  let { bookId, chapterNumber, verseNumber }: VerseInfo = parseVerseId(verseId);
  verseNumber -= 1;
  if (verseNumber < 1) {
    chapterNumber -= 1;         // Wrap to previous chapter
    if (chapterNumber < 1) {
      bookId -= 1;              // Wrap to previous book.
      if (bookId < 1) {
        bookId = 66;            // Wrap around to Revelation.
      }
      chapterNumber = chapterCount(bookId);
    }
    verseNumber = verseCount(bookId, chapterNumber);
  }
  return generateVerseId({ bookId, chapterNumber, verseNumber });
}

export function incrementVerseId(verseId: string) {
  let { bookId, chapterNumber, verseNumber }: VerseInfo = parseVerseId(verseId);
  verseNumber += 1;
  if (verseNumber > verseCount(bookId, chapterNumber)) {
    chapterNumber += 1;         // Wrap to next chapter.
    if (chapterNumber > chapterCount(bookId)) {
      bookId += 1;              // Wrap to next book.
      if (bookId > 66) {
        bookId = 1;             // Wrap around to Genesis.
      }
      chapterNumber = 1;
    }
    verseNumber = 1;
  }
  return generateVerseId({ bookId, chapterNumber, verseNumber });
}


const REFERENCE_REGEX = /^(.+?)(?:[.]?\s*(\d+)(?:([:.,]|\s)(\d+))?)?[;.,]?$/;

export function parseReference(reference: string, bookNameList: string[]): string | null {
  // Parse the reference into three parts.
  const matches = reference.match(REFERENCE_REGEX);
  if (matches == null) {
    return null;
  }
  const [, bookStr, chapterStr, , verseStr] = matches;

  // Find the book ID.
  let bookId;
  const bookNames = bookNameList.map((name, i) => ({
    name,
    id: i + 1,
  }));
  const results = fuzzysort.go(bookStr.toLowerCase().trim(), bookNames, {
    key: 'name',
  });
  if (results.length > 0) {
    bookId = results[0].obj.id;
  } else {
    return null;
  }

  // Coerce the chapter number to be valid.
  const chapterNumber = chapterStr
    ? clamp(parseInt(chapterStr), 1, chapterCount(bookId))
    : 1;
  // Coerce the verse number to be valid.
  const verseNumber = verseStr
    ? clamp(parseInt(verseStr), 1, verseCount(bookId, chapterNumber))
    : 1;
  return `${bookId.toString().padStart(2, '0')}${chapterNumber.toString().padStart(3, '0')}${verseNumber.toString().padStart(3, '0')}`;
}

export function parseVerseId(verseId: string): VerseInfo {
  const bookId = parseInt(verseId.slice(0, 2));
  const chapterNumber = parseInt(verseId.slice(2, 5));
  const verseNumber = parseInt(verseId.slice(5, 8));
  return { bookId, chapterNumber, verseNumber };
}

export function generateVerseId({
  bookId,
  chapterNumber,
  verseNumber,
}: VerseInfo) {
  return [
    bookId.toString().padStart(2, '0'),
    chapterNumber.toString().padStart(3, '0'),
    verseNumber.toString().padStart(3, '0'),
  ].join('');
}

export function chapterCount(bookId: number): number {
  return verseCounts[bookId - 1].length;
}

export function verseCount(bookId: number, chapterNumber: number): number {
  return verseCounts[bookId - 1][chapterNumber - 1];
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}


