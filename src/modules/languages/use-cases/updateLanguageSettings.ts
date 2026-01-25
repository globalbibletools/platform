import { NotFoundError } from "@/shared/errors";
import languageRepository from "../data-access/languageRepository";
import { SourceLanguageMissingError, TextDirectionRaw } from "../model";

export interface UpdateLanguageSettingsRequest {
  code: string;
  englishName: string;
  localName: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string;
}

export async function updateLanguageSettings(
  request: UpdateLanguageSettingsRequest,
): Promise<void> {
  const exists = await languageRepository.existsByCode(request.code);
  if (!exists) throw new NotFoundError("Language");

  if (request.referenceLanguageId) {
    const exists = await languageRepository.existsById(
      request.referenceLanguageId,
    );
    if (!exists)
      throw new SourceLanguageMissingError(request.referenceLanguageId);
  }

  await languageRepository.update(request);
}
