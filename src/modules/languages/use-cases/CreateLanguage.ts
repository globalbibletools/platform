import { ulid } from "@/shared/ulid";
import { LanguageRepository } from "../data-access/types";
import { LanguageAlreadyExistsError, TextDirectionRaw } from "../model";

export interface CreateLanguageRequest {
  code: string;
  name: string;
}

export default class CreateLanguage {
  constructor(private readonly languageRepo: LanguageRepository) {}

  async execute(request: CreateLanguageRequest): Promise<void> {
    const exists = await this.languageRepo.existsByCode(request.code);
    if (exists) {
      throw new LanguageAlreadyExistsError(request.code);
    }

    await this.languageRepo.create({
      id: ulid(),
      code: request.code,
      name: request.name,
      font: "Noto Sans",
      textDirection: TextDirectionRaw.LTR,
      translationIds: [],
      gtSourceLanguage: "en",
    });
  }
}
