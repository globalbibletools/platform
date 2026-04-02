import { expect, test } from "vitest";
import { compileBooks } from "./exportGlossesChildJob";

async function* wordsIterator(
  words: Array<{
    id: string;
    verseId: string;
    gloss: string | null;
  }>,
) {
  for (const word of words) {
    yield word;
  }
}

test("compiles Obadiah chapter 1 and then Matthew chapter 1", async () => {
  const books = [
    { id: 31, name: "Obadiah" },
    { id: 40, name: "Matthew" },
  ];

  const verses = [
    { id: "oba-1-1", bookId: 31, chapter: 1 },
    { id: "oba-1-2", bookId: 31, chapter: 1 },
    { id: "oba-1-3", bookId: 31, chapter: 1 },
    { id: "mat-1-1", bookId: 40, chapter: 1 },
    { id: "mat-1-2", bookId: 40, chapter: 1 },
    { id: "mat-1-3", bookId: 40, chapter: 1 },
  ];

  const words = wordsIterator([
    { id: "w-1", verseId: "oba-1-1", gloss: "vision" },
    { id: "w-2", verseId: "oba-1-2", gloss: "nations" },
    { id: "w-3", verseId: "oba-1-3", gloss: "pride" },
    { id: "w-4", verseId: "mat-1-1", gloss: "book" },
    { id: "w-5", verseId: "mat-1-2", gloss: "Abraham" },
    { id: "w-6", verseId: "mat-1-3", gloss: "Judah" },
  ]);

  await expect(compileBooks({ books, verses, words })).resolves.toEqual([
    {
      id: 31,
      name: "Obadiah",
      chapters: [
        {
          id: 1,
          verses: [
            {
              id: "oba-1-1",
              words: [{ id: "w-1", gloss: "vision" }],
            },
            {
              id: "oba-1-2",
              words: [{ id: "w-2", gloss: "nations" }],
            },
            {
              id: "oba-1-3",
              words: [{ id: "w-3", gloss: "pride" }],
            },
          ],
        },
      ],
    },
    {
      id: 40,
      name: "Matthew",
      chapters: [
        {
          id: 1,
          verses: [
            {
              id: "mat-1-1",
              words: [{ id: "w-4", gloss: "book" }],
            },
            {
              id: "mat-1-2",
              words: [{ id: "w-5", gloss: "Abraham" }],
            },
            {
              id: "mat-1-3",
              words: [{ id: "w-6", gloss: "Judah" }],
            },
          ],
        },
      ],
    },
  ]);
});
