import { beforeEach } from "vitest";
import { ActorClaims, LanguageClaims } from "./model";

interface ActorConfig {
  actor: ActorClaims;
  languages?: LanguageClaims[];
}

const fakeClaimsRepository = {
  actors: [] as ActorConfig[],

  reset() {
    this.actors = [];
  },

  initActor(actorConfig: ActorConfig) {
    this.actors.push(actorConfig);
  },

  async findActorClaims(actorId: string): Promise<ActorClaims> {
    const config = this.actors.find((a) => a.actor.id === actorId);
    return (
      config?.actor ?? {
        id: actorId,
        systemRoles: [],
      }
    );
  },

  async findLanguageClaims(
    languageCode: string,
    actorId: string,
  ): Promise<LanguageClaims> {
    const config = this.actors.find((a) => a.actor.id === actorId);
    return (
      config?.languages?.find((l) => l.code === languageCode) ?? {
        code: languageCode,
        isMember: false,
      }
    );
  },
};
export default fakeClaimsRepository;

beforeEach(() => {
  fakeClaimsRepository.reset();
});
