import { verifySession } from "@/session";
import { createServerFn } from "@tanstack/react-start";
import { getUserLanguagesReadModel } from "../languages/read-models/getUserLanguagesReadModel";
import { LanguageReadModel } from "../languages/read-models/getAllLanguagesReadModel";

export const fetchAuthState = createServerFn().handler(async () => {
  const session = await verifySession();

  let languages: LanguageReadModel[] = [];
  if (session) {
    languages = await getUserLanguagesReadModel(session.user.id);
  }

  return {
    user:
      session?.user ?
        {
          id: session.user.id,
          name: session.user.name,
        }
      : undefined,
    systemRoles: session?.user.roles ?? [],
    languages: languages.map(({ id, englishName, code }) => ({
      id,
      englishName,
      code,
    })),
  };
});
