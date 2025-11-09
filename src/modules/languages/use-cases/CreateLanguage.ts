import { ulid } from "@/shared/ulid";
import { LanguageRepository } from "../data-access/types";
import { LanguageAlreadyExistsError, TextDirectionRaw } from "../model";

export interface CreateLanguageRequest {
  code: string;
  english_name: string;
  local_name: string;
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
      english_name: request.english_name,
      local_name: request.local_name,
      font: "Noto Sans",
      textDirection: TextDirectionRaw.LTR,
      translationIds: [],
    });
  }
}
