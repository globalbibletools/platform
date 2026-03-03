import { DbLanguage } from "@/modules/languages/data-access/types";
import {
  languageFactory,
  languageMemberFactory,
} from "@/modules/languages/test-utils/factories";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import type { Selectable } from "kysely";
import type { UserTable } from "@/modules/users/data-access/types";

export interface UserScenarioDefinition {
  roles?: "admin"[];
}

export interface LanguageScenarioDefinition {
  members?: string[];
}

export interface ScenarioDefinition {
  users?: Record<string, UserScenarioDefinition>;
  languages?: Record<string, LanguageScenarioDefinition>;
}

export interface Scenario {
  users: Record<string, Selectable<UserTable>>;
  languages: Record<string, DbLanguage>;
}

export async function createScenario(
  ...definitions: ScenarioDefinition[]
): Promise<Scenario> {
  const scenario: Scenario = {
    users: {},
    languages: {},
  };
  for (const definition of definitions) {
    if (definition.users) {
      for (const [id, userDefinition] of Object.entries(definition.users)) {
        const { user } = await userFactory.build({
          roles: userDefinition.roles,
        });
        scenario.users[id] = user;
      }
    }
  }

  for (const definition of definitions) {
    if (definition.languages) {
      for (const [id, languageDefinition] of Object.entries(
        definition.languages,
      )) {
        const language = await languageFactory.build();
        scenario.languages[id] = language;
        if (languageDefinition.members) {
          for (const userId of languageDefinition.members) {
            const user = scenario.users[userId];

            await languageMemberFactory.build({
              languageId: language.id,
              userId: user.id,
            });
          }
        }
      }
    }
  }

  return scenario;
}
