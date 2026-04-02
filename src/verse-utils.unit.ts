import { describe, test, expect } from "vitest";
import { decrementVerseId, incrementVerseId } from "./verse-utils";

describe("decrementVerseId", () => {
  test("decrements the verse id to the previous verse", () => {
    expect(decrementVerseId("01001002")).toEqual("01001001");
  });

  test("decrements the verse id to the previous chapter", () => {
    expect(decrementVerseId("01002001")).toEqual("01001031");
  });

  test("decrements the verse id to the previous book", () => {
    expect(decrementVerseId("02001001")).toEqual("01050026");
  });

  test("decrements the verse id to back to Revelation", () => {
    expect(decrementVerseId("01001001")).toEqual("66022021");
  });

  test("skips missing verses when decrementing within a chapter", () => {
    expect(decrementVerseId("40016004")).toEqual("40016002");
  });

  test("skips missing verses when decrementing across chapters", () => {
    expect(decrementVerseId("43008012")).toEqual("43007052");
  });
});

describe("incrementVerseId", () => {
  test("increments the verse id to the next verse", () => {
    expect(incrementVerseId("01001001")).toEqual("01001002");
  });

  test("increments the verse id to the next chapter", () => {
    expect(incrementVerseId("01001031")).toEqual("01002001");
  });

  test("increments the verse id to the next book", () => {
    expect(incrementVerseId("01050026")).toEqual("02001001");
  });

  test("increments the verse id to back to Genesis", () => {
    expect(incrementVerseId("66022021")).toEqual("01001001");
  });

  test("skips missing verses when incrementing within a chapter", () => {
    expect(incrementVerseId("40016002")).toEqual("40016004");
  });

  test("skips missing verses when incrementing across chapters", () => {
    expect(incrementVerseId("43007052")).toEqual("43008012");
  });
});
