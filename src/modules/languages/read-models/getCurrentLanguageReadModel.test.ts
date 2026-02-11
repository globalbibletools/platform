import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getCurrentLanguageReadModel } from "./getCurrentLanguageReadModel";
import {
  languageFactory,
  languageMemberFactory,
} from "../test-utils/factories";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { userFactory } from "@/modules/users/test-utils/factories";

initializeDatabase();

test("returns undefined if the language does not exist", async () => {
  const result = await getCurrentLanguageReadModel("nonexistent");
  expect(result).toBeNull();
});

test("returns language when no user is provided", async () => {
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    machineGlossStrategy: MachineGlossStrategy.LLM,
  });

  const result = await getCurrentLanguageReadModel("spa");

  expect(result).toEqual({
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    machineGlossStrategy: language.machineGlossStrategy,
    referenceLanguage: null,
    isMember: false,
  });
});

test("returns language when user is not a member", async () => {
  const user = await userFactory.build();
  const language = await languageFactory.build();

  const result = await getCurrentLanguageReadModel(language.code, user.id);

  expect(result).toEqual({
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    machineGlossStrategy: language.machineGlossStrategy,
    referenceLanguage: null,
    isMember: false,
  });
});

test("returns language when user is a member", async () => {
  const user = await userFactory.build();
  const language = await languageFactory.build();
  await languageMemberFactory.build({
    userId: user.id,
    languageId: language.id,
  });

  const result = await getCurrentLanguageReadModel(language.code, user.id);

  expect(result).toEqual({
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    machineGlossStrategy: language.machineGlossStrategy,
    referenceLanguage: null,
    isMember: true,
  });
});

test("returns language with translation ids", async () => {
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: ["esv", "kjv"],
    referenceLanguageId: null,
  });

  const result = await getCurrentLanguageReadModel("spa");

  expect(result).toEqual({
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    referenceLanguage: null,
    isMember: false,
  });
});

test("returns language with reference language", async () => {
  const referenceLanguage = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    referenceLanguageId: referenceLanguage.id,
  });

  const result = await getCurrentLanguageReadModel("spa");

  expect(result).toEqual({
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    referenceLanguage: referenceLanguage.code,
    isMember: false,
  });
});
