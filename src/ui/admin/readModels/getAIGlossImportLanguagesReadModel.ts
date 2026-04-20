import { TTLCache } from "@isaacs/ttlcache";
import {
  aiGlossImportService,
  type Language,
} from "@/modules/translation/data-access/aiGlossImportService";

const CACHE_KEY = "ai-gloss-import-languages";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

const aiGlossImportLanguagesCache = new TTLCache<string, Array<Language>>({
  ttl: THREE_HOURS_MS,
});

export async function getAIGlossImportLanguagesReadModel() {
  const cachedLanguages = aiGlossImportLanguagesCache.get(CACHE_KEY, {
    checkAgeOnGet: true,
  });
  if (cachedLanguages) {
    return cachedLanguages;
  }

  const languages = await aiGlossImportService.getAvailableLanguages();
  aiGlossImportLanguagesCache.set(CACHE_KEY, languages);
  return languages;
}
