import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageProgressReadModel } from "./getLanguageProgressReadModel";
import { createScenario } from "@/tests/scenarios";
import {
  phraseFactory,
  phraseWordFactory,
  glossFactory,
} from "@/modules/translation/test-utils/factories";
import { GlossStateRaw } from "@/modules/translation/types";

initializeDatabase({ seed: "minimal" });

test("returns zero approved counts for a language with no glosses", async () => {
  const scenario = await createScenario({ languages: { spanish: {} } });
  const result = await getLanguageProgressReadModel(
    scenario.languages.spanish.code,
  );

  expect(result).toEqual([
    {
      approvedCount: 0,
      name: "Gen",
      nextVerse: "01001001",
      wordCount: 53,
    },
    {
      approvedCount: 0,
      name: "Jhn",
      nextVerse: "43001001",
      wordCount: 61,
    },
  ]);
});

test("returns language progress by code when it exists", async () => {
  const scenario = await createScenario({
    languages: { spanish: {} },
  });
  const language = scenario.languages.spanish;

  // Approve a gloss for the first word of Genesis 1:1
  const phrase = await phraseFactory.build({ languageId: language.id });
  await phraseWordFactory.build({
    phraseId: String(phrase.id),
    wordId: "0100100101",
  });
  await glossFactory.build({
    phraseId: phrase.id,
    state: GlossStateRaw.Approved,
  });

  const result = await getLanguageProgressReadModel(language.code);

  expect(result).toEqual([
    {
      approvedCount: 1,
      name: "Gen",
      nextVerse: "01001001",
      wordCount: 53,
    },
    {
      approvedCount: 0,
      name: "Jhn",
      nextVerse: "43001001",
      wordCount: 61,
    },
  ]);
});
