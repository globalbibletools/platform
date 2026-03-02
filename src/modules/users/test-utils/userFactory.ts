import { faker } from "@faker-js/faker/locale/en";
import { Scrypt } from "oslo/password";
import { getDb } from "@/db";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "../model/EmailStatus";
import { SystemRoleRaw } from "../model/SystemRole";
import { UserStatusRaw } from "../model/UserStatus";
import type { Selectable } from "kysely";
import type {
  ResetPasswordTokenTable,
  UserEmailVerificationTable,
  UserInvitationTable,
  UserSystemRoleTable,
  UserTable,
} from "../data-access/types";

const HASHED_PASSWORD = await new Scrypt().hash("pa$$word");

export interface UserFactoryOptions {
  role?: "admin";
  state?: "active" | "invited" | "disabled";
  passwordReset?: "active" | "expired";
  emailVerification?: "active" | "expired";
  invitation?: "active" | "expired";
}

export interface UserFactoryResult {
  user: Selectable<UserTable>;
  systemRoles: Selectable<UserSystemRoleTable>[];
  invitations: Selectable<UserInvitationTable>[];
  passwordResets: Selectable<ResetPasswordTokenTable>[];
  emailVerification: Selectable<UserEmailVerificationTable> | undefined;
}

export const userFactory = {
  async build(options: UserFactoryOptions = {}): Promise<UserFactoryResult> {
    const db = getDb();
    const state = options.state ?? "active";

    const user = await db
      .insertInto("users")
      .values({
        id: ulid(),
        name: state === "invited" ? null : faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        hashed_password: state === "active" ? HASHED_PASSWORD : null,
        email_status:
          state === "invited" ?
            EmailStatusRaw.Unverified
          : EmailStatusRaw.Verified,
        status:
          state === "disabled" ? UserStatusRaw.Disabled : UserStatusRaw.Active,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const systemRoles: Selectable<UserSystemRoleTable>[] = [];
    if (options.role === "admin") {
      const role = await db
        .insertInto("user_system_role")
        .values({ user_id: user.id, role: SystemRoleRaw.Admin })
        .returningAll()
        .executeTakeFirstOrThrow();
      systemRoles.push(role);
    }

    const invitations: Selectable<UserInvitationTable>[] = [];
    if (state !== "disabled") {
      const invitationState =
        options.invitation ?? (state === "invited" ? "active" : undefined);
      if (invitationState !== undefined) {
        const invitation = await db
          .insertInto("user_invitation")
          .values({
            user_id: user.id,
            token: faker.string.alphanumeric(20),
            expires_at: generateExpirationDate(invitationState),
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        invitations.push(invitation);
      }
    }

    const passwordResets: Selectable<ResetPasswordTokenTable>[] = [];
    if (state === "active" && options.passwordReset !== undefined) {
      const reset = await db
        .insertInto("reset_password_token")
        .values({
          user_id: user.id,
          token: faker.string.alphanumeric(20),
          expires_at: generateExpirationDate(options.passwordReset),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      passwordResets.push(reset);
    }

    let emailVerification: Selectable<UserEmailVerificationTable> | undefined;
    if (state === "active" && options.emailVerification !== undefined) {
      emailVerification = await db
        .insertInto("user_email_verification")
        .values({
          user_id: user.id,
          email: user.email,
          token: faker.string.alphanumeric(20),
          expires_at: generateExpirationDate(options.emailVerification),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    return {
      user,
      systemRoles,
      invitations,
      passwordResets,
      emailVerification,
    };
  },
};

function generateExpirationDate(status: "active" | "expired"): Date {
  return status === "active" ? faker.date.soon() : faker.date.past();
}
