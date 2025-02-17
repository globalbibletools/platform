import { NotFoundError } from "@/shared/errors";
import {
  LanguageMemberRepository,
  LanguageRepository,
} from "../data-access/types";
import { LanguageMemberRoleRaw } from "../model";

export interface ChangeLanguageMemberRolesRequest {
  code: string;
  userId: string;
  roles: LanguageMemberRoleRaw[];
}

export default class ChangeLanguageMemberRoles {
  constructor(
    private readonly languageRepo: LanguageRepository,
    private readonly languageMemberRepo: LanguageMemberRepository,
  ) {}

  async execute(request: ChangeLanguageMemberRolesRequest): Promise<void> {
    const language = await this.languageRepo.findByCode(request.code);
    if (!language) throw new NotFoundError("Language");

    const memberExists = await this.languageMemberRepo.exists(
      language.id,
      request.userId,
    );
    if (!memberExists) throw new NotFoundError("LanguageMember");

    await this.languageMemberRepo.update({
      languageId: language.id,
      userId: request.userId,
      roles: request.roles,
    });
  }
}
