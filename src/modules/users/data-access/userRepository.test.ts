import { getDb } from "@/db";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test } from "vitest";
import userRepository from "./userRepository";
import { ulid } from "@/shared/ulid";
import UserStatus, { UserStatusRaw } from "../model/UserStatus";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import Invitation from "../model/Invitation";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";
import Password from "../model/Password";
import { addDays, endOfTomorrow } from "date-fns";
import PasswordReset from "../model/PasswordReset";
import EmailVerification from "../model/EmailVerification";
import SystemRole, { SystemRoleRaw } from "../model/SystemRole";

initializeDatabase();

describe("existsByEmail", () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
  };
  beforeEach(async () => {
    await getDb().insertInto("users").values(user).execute();
  });

  test("returns true if user exists", async () => {
    await expect(userRepository.existsByEmail(user.email)).resolves.toBe(true);
  });

  test("returns false if user does not exist", async () => {
    await expect(
      userRepository.existsByEmail("another@example.com"),
    ).resolves.toBe(false);
  });
});

describe("findById", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(userRepository.findById(ulid())).resolves.toBeUndefined();
  });

  test("returns user with invitations", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with password resets", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const passwordReset1 = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const passwordReset2 = {
      user_id: user.id,
      token: "token5678",
      expires: BigInt(
        Math.round(addDays(endOfTomorrow(), 1).valueOf() / 1000) * 1000,
      ),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values([passwordReset1, passwordReset2])
      .execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset1.token,
            expiresAt: new Date(Number(passwordReset1.expires)),
          }),
          new PasswordReset({
            token: passwordReset2.token,
            expiresAt: new Date(Number(passwordReset2.expires)),
          }),
        ],
        invitations: [],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with email verification", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const emailVerification = {
      user_id: user.id,
      token: "asdf1234",
      email: "new@example.com",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with system role", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const systemRole = {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_system_role").values(systemRole).execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [SystemRole.Admin],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});

describe("findByEmail", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(
      userRepository.findByEmail("test@example.com"),
    ).resolves.toBeUndefined();
  });

  test("returns user with invitations", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with password resets", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const passwordReset1 = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const passwordReset2 = {
      user_id: user.id,
      token: "token5678",
      expires: BigInt(
        Math.round(addDays(endOfTomorrow(), 1).valueOf() / 1000) * 1000,
      ),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values([passwordReset1, passwordReset2])
      .execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset1.token,
            expiresAt: new Date(Number(passwordReset1.expires)),
          }),
          new PasswordReset({
            token: passwordReset2.token,
            expiresAt: new Date(Number(passwordReset2.expires)),
          }),
        ],
        invitations: [],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with email verification", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const emailVerification = {
      user_id: user.id,
      token: "asdf1234",
      email: "new@example.com",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with system role", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const systemRole = {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_system_role").values(systemRole).execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [SystemRole.Admin],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});

describe("findByInvitationToken", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(
      userRepository.findByInvitationToken("token1234"),
    ).resolves.toBeUndefined();
  });

  test("returns user with invitations", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(
      userRepository.findByInvitationToken(invite.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with password resets", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const passwordReset1 = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const passwordReset2 = {
      user_id: user.id,
      token: "token5678",
      expires: BigInt(
        Math.round(addDays(endOfTomorrow(), 1).valueOf() / 1000) * 1000,
      ),
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values([passwordReset1, passwordReset2])
      .execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(
      userRepository.findByInvitationToken(invite.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset1.token,
            expiresAt: new Date(Number(passwordReset1.expires)),
          }),
          new PasswordReset({
            token: passwordReset2.token,
            expiresAt: new Date(Number(passwordReset2.expires)),
          }),
        ],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with email verification", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const emailVerification = {
      user_id: user.id,
      token: "asdf1234",
      email: "new@example.com",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with system role", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
      status: UserStatusRaw.Active,
    };
    const systemRole = {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_system_role").values(systemRole).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(userRepository.findByEmail(user.email)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [SystemRole.Admin],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});

describe("findByResetPasswordToken", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(
      userRepository.findByResetPasswordToken("token1234"),
    ).resolves.toBeUndefined();
  });

  test("returns user with password resets", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$word",
    };
    const passwordReset = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values(passwordReset)
      .execute();

    await expect(
      userRepository.findByResetPasswordToken(passwordReset.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset.token,
            expiresAt: new Date(Number(passwordReset.expires)),
          }),
        ],
        invitations: [],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with invitations", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    const passwordReset = {
      user_id: user.id,
      token: "reset1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values(passwordReset)
      .execute();

    await expect(
      userRepository.findByResetPasswordToken(passwordReset.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset.token,
            expiresAt: new Date(Number(passwordReset.expires)),
          }),
        ],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with email verification", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$word",
    };
    const emailVerification = {
      user_id: user.id,
      token: "asdf1234",
      email: "new@example.com",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const passwordReset = {
      user_id: user.id,
      token: "reset1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();
    await getDb()
      .insertInto("reset_password_token")
      .values(passwordReset)
      .execute();

    await expect(
      userRepository.findByResetPasswordToken(passwordReset.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset.token,
            expiresAt: new Date(Number(passwordReset.expires)),
          }),
        ],
        invitations: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with system roles", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$word",
    };
    const systemRole = {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    };
    const passwordReset = {
      user_id: user.id,
      token: "reset1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_system_role").values(systemRole).execute();
    await getDb()
      .insertInto("reset_password_token")
      .values(passwordReset)
      .execute();

    await expect(
      userRepository.findByResetPasswordToken(passwordReset.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset.token,
            expiresAt: new Date(Number(passwordReset.expires)),
          }),
        ],
        invitations: [],
        emailVerification: undefined,
        systemRoles: [SystemRole.Admin],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});

describe("findByEmailVerificationToken", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(
      userRepository.findByEmailVerificationToken("token1234"),
    ).resolves.toBeUndefined();
  });

  test("returns user with email verification", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
    };
    const emailVerification = {
      user_id: user.id,
      email: "new@example.com",
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();

    await expect(
      userRepository.findByEmailVerificationToken(emailVerification.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with password resets", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
    };
    const emailVerification = {
      user_id: user.id,
      email: "new@example.com",
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const passwordReset = {
      user_id: user.id,
      token: "reset5678",
      expires: BigInt(
        Math.round(addDays(endOfTomorrow(), 1).valueOf() / 1000) * 1000,
      ),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();
    await getDb()
      .insertInto("reset_password_token")
      .values(passwordReset)
      .execute();

    await expect(
      userRepository.findByEmailVerificationToken(emailVerification.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [
          new PasswordReset({
            token: passwordReset.token,
            expiresAt: new Date(Number(passwordReset.expires)),
          }),
        ],
        invitations: [],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with invitations", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const emailVerification = {
      user_id: user.id,
      email: "new@example.com",
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const invite = {
      user_id: user.id,
      token: "invite5678",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(
      userRepository.findByEmailVerificationToken(emailVerification.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns user with system roles", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      name: "Test User",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
      hashed_password: "pa$$word",
    };
    const emailVerification = {
      user_id: user.id,
      email: "new@example.com",
      token: "token1234",
      expires: BigInt(Math.round(endOfTomorrow().valueOf() / 1000) * 1000),
    };
    const systemRole = {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb()
      .insertInto("user_email_verification")
      .values(emailVerification)
      .execute();
    await getDb().insertInto("user_system_role").values(systemRole).execute();

    await expect(
      userRepository.findByEmailVerificationToken(emailVerification.token),
    ).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        password: new Password({ hash: user.hashed_password }),
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [],
        systemRoles: [SystemRole.Admin],
        emailVerification: new EmailVerification({
          token: emailVerification.token,
          email: emailVerification.email,
          expiresAt: new Date(Number(emailVerification.expires)),
        }),
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});
