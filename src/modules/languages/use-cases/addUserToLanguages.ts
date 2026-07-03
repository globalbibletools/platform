import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";
import { BulkOperationError, NotFoundError } from "@/shared/errors";

export interface AddUserToLanguagesRequest {
  userId: string;
  languages: string[];
}

export async function addUserToLanguages(
  request: AddUserToLanguagesRequest,
): Promise<void> {
  const errors: Record<string, Error> = {};

  for (const code of request.languages) {
    try {
      const language = await languageRepository.findByCode(code);
      if (!language) {
        errors[code] = new NotFoundError("Language");
        continue;
      }

      const isMember = await languageMemberRepository.exists(
        language.id,
        request.userId,
      );
      if (!isMember) {
        await languageMemberRepository.create({
          languageId: language.id,
          userId: request.userId,
        });
      }
    } catch (error) {
      errors[code] = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new BulkOperationError(errors);
  }
}
