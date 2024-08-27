"use server";

import * as z from 'zod';
import {getLocale, getTranslations } from 'next-intl/server';
import { transaction } from '@/app/db';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { notFound, redirect } from 'next/navigation';
import { bookKeys } from '@/data/book-keys'
import { verseCounts } from '@/data/verse-counts';
import fuzzysort from 'fuzzysort';

const requestSchema = z.object({
    language: z.string(),
    reference: z.string()
})

function chapterCount(bookId: number): number {
  return verseCounts[bookId - 1].length;
}

function verseCount(bookId: number, chapterNumber: number): number {
  return verseCounts[bookId - 1][chapterNumber - 1];
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}


const REFERENCE_REGEX = /^(.+?)(?:[.]?\s*(\d+)(?:([:.,]|\s)(\d+))?)?[;.,]?$/;

function parseReference(reference: string, bookNameList: string[]): string | null {
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

export async function changeInterlinearLocation(formData: FormData): Promise<void> {
    const locale = await getLocale();
    const t = await getTranslations('InterlinearLayout');

    const request = requestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    let verseId
    try {
        verseId = parseReference(request.data.reference, t.raw('book_names'))
    } catch (error) {
        console.log(error)
        return
    }

    redirect(`/${locale}/interlinear/${request.data.language}/${verseId}`)
}



