import { verifySession } from "@/session";
import { createServerFn } from "@tanstack/react-start";
import { getUserLanguagesReadModel } from "../languages/read-models/getUserLanguagesReadModel";
import { SystemRoleRaw } from "@/modules/users/types";
import { UserLanguageReadModel } from "../languages/read-models/getUserLanguagesReadModel";

export interface AuthState {
  user?: { id: string; name: string };
  systemRoles: SystemRoleRaw[];
  languages: { id: string; englishName: string; code: string }[];
}

export const fetchAuthState = createServerFn().handler(
  async (): Promise<AuthState> => {
    const session = await verifySession();

    let languages: UserLanguageReadModel[] = [];
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
  },
);
