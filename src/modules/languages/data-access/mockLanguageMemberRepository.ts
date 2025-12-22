import { beforeEach } from "vitest";
import { LanguageMember } from "../model";

const mockLanguageMemberRepo = {
  members: [] as LanguageMember[],

  reset() {
    this.members = [];
  },

  async exists(languageId: string, userId: string): Promise<boolean> {
    return this.members.some(
      (m) => m.languageId === languageId || m.userId === userId,
    );
  },

  async create(member: LanguageMember): Promise<void> {
    const exists = this.members.some(
      (m) => m.languageId === member.languageId && m.userId === member.userId,
    );
    if (exists) return;

    this.members.push(member);
  },

  async delete(languageId: string, userId: string): Promise<void> {
    this.members = this.members.filter(
      (m) => m.languageId !== languageId || m.userId !== userId,
    );
  },

  async deleteAll(userId: string): Promise<void> {
    this.members = this.members.filter((m) => m.userId !== userId);
  },
};
export default mockLanguageMemberRepo;

beforeEach(() => {
  mockLanguageMemberRepo.reset();
});
