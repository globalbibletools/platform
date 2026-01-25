import { ulid } from "@/shared/ulid";
import languageRepository from "../data-access/languageRepository";
import { LanguageAlreadyExistsError } from "../model";

export interface CreateLanguageRequest {
  code: string;
  englishName: string;
  localName: string;
}

export async function createLanguage(
  request: CreateLanguageRequest,
): Promise<void> {
  const exists = await languageRepository.existsByCode(request.code);
  if (exists) {
    throw new LanguageAlreadyExistsError(request.code);
  }

  await languageRepository.create({
    id: ulid(),
    code: request.code,
    englishName: request.englishName,
    localName: request.localName,
  });
}
