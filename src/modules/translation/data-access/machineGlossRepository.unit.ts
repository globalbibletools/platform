import { describe, expect, test } from "vitest";
import { Readable } from "stream";
import {
  FilterMissingWordsTransform,
  normalizeWordIdToNumber,
  StreamedMachineGloss,
} from "./machineGlossRepository";

async function readAllChunks<T>(stream: Readable): Promise<Array<T>> {
  const chunks: Array<T> = [];

  for await (const chunk of stream) {
    chunks.push(chunk as T);
  }

  return chunks;
}

describe("normalizeWordIdToNumber", () => {
  test("removes hyphens before converting to number", () => {
    expect(normalizeWordIdToNumber("01-001-001-01")).toBe(100100101);
  });

  test("returns NaN for non-numeric values", () => {
    expect(Number.isNaN(normalizeWordIdToNumber("invalid"))).toBe(true);
  });
});

describe("FilterMissingWordsTransform", () => {
  test("keeps words that exist in the set", async () => {
    const input: Array<StreamedMachineGloss> = [
      { wordId: "0100100101", gloss: "one" },
    ];

    const output = await readAllChunks<StreamedMachineGloss>(
      Readable.from(input).pipe(
        new FilterMissingWordsTransform(new Set([100100101])),
      ),
    );

    expect(output).toEqual([input]);
  });

  test("drops words that do not exist in the set", async () => {
    const output = await readAllChunks<StreamedMachineGloss>(
      Readable.from([{ wordId: "0100100101", gloss: "one" }]).pipe(
        new FilterMissingWordsTransform(new Set([100100102])),
      ),
    );

    expect(output).toEqual([]);
  });

  test("keeps words with hyphenated ids that exist in the set", async () => {
    const output = await readAllChunks<StreamedMachineGloss>(
      Readable.from([{ wordId: "01-001-001-01", gloss: "one" }]).pipe(
        new FilterMissingWordsTransform(new Set([100100101])),
      ),
    );

    expect(output).toEqual([[{ wordId: "01-001-001-01", gloss: "one" }]]);
  });

  test("drops words when their id is not a numeric string", async () => {
    const output = await readAllChunks<StreamedMachineGloss>(
      Readable.from([{ wordId: "not-a-number", gloss: "one" }]).pipe(
        new FilterMissingWordsTransform(new Set([100100101])),
      ),
    );

    expect(output).toEqual([]);
  });

  test("drops only missing words in a chunk, keeping the rest", async () => {
    const inputChunk = [
      { wordId: "0100100101", gloss: "one" },
      { wordId: "01-001-001-02", gloss: "two" },
      { wordId: "0100100199", gloss: "missing" },
      { wordId: "invalid", gloss: "invalid" },
    ];

    const output = await readAllChunks<Array<StreamedMachineGloss>>(
      Readable.from([inputChunk]).pipe(
        new FilterMissingWordsTransform(new Set([100100101, 100100102])),
      ),
    );

    expect(output).toEqual([
      [
        { wordId: "0100100101", gloss: "one" },
        { wordId: "01-001-001-02", gloss: "two" },
      ],
    ]);
  });
});
