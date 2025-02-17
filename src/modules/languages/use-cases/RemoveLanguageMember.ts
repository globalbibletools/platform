import { NotFoundError } from "@/shared/errors";
import {
  LanguageMemberRepository,
  LanguageRepository,
} from "../data-access/types";

export interface RemoveLanguageMemberRequest {
  code: string;
  userId: string;
}

export default class RemoveLanguageMember {
  constructor(
    private readonly languageRepo: LanguageRepository,
    private readonly languageMemberRepo: LanguageMemberRepository,
  ) {}

  async execute(request: RemoveLanguageMemberRequest): Promise<void> {
    const language = await this.languageRepo.findByCode(request.code);
    if (!language) throw new NotFoundError("Language");

    await this.languageMemberRepo.delete(language.id, request.userId);
  }
}
