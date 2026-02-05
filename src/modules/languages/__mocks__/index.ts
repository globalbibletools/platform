import { beforeEach, vitest } from "vitest";
import {
  resolveLanguageByCode as originalResolveLanguageByCode,
  ResolvedLanguage,
} from "../use-cases/resolveLanguageByCode";

let languages: ResolvedLanguage[] = [];

export const resolveLanguageByCode = vitest.fn<
  typeof originalResolveLanguageByCode
>(async (code) => {
  return languages.find((lang) => lang.code === code);
});

export function initLanguageModuleMock(options: {
  languages: ResolvedLanguage[];
}) {
  languages = options.languages;
}

beforeEach(() => {
  languages = [];
  resolveLanguageByCode.mockReset();
});
