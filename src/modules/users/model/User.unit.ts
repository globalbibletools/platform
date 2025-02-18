import { describe, test, expect } from "vitest";
import Password from "./Password";
import UserEmail from "./UserEmail";
import EmailStatus from "./EmailStatus";
import User from "./User";
import PasswordReset from "./PasswordReset";
import { Scrypt } from "oslo/password";
import {
  InvalidInvitationTokenError,
  InvalidPasswordResetToken,
  UserAlreadyActiveError,
  UserDisabledError,
} from "./errors";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";
import Invitation from "./Invitation";
import UserStatus from "./UserStatus";

const scrypt = new Scrypt();

describe("invite", () => {
  test("creates new user with an invite", () => {
    const email = "TEST@example.com";
    const { user, token } = User.invite(email);
    expect(token).toBeToken(24);
    expect(user).toEqual(
      new User({
        id: expect.toBeUlid(),
        email: new UserEmail({
          address: email.toLowerCase(),
          status: EmailStatus.Unverified,
        }),
        invitations: [
          new Invitation({
            token,
            expiresAt: expect.toBeDaysIntoFuture(7),
          }),
        ],
        passwordResets: [],
        status: UserStatus.Active,
      }),
    );
  });
});

describe("reinvite", () => {
  test("throws error if user is already active", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });

    expect(() => user.reinvite()).toThrow(new UserAlreadyActiveError());
  });

  test("throws error if user is disabled", () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Disabled,
    };
    const user = new User({ ...props });

    expect(() => user.reinvite()).toThrow(new UserDisabledError());
    expect(user).toEqual(new User(props));
  });

  test("creates new invite for user", () => {
    const invitations = [
      new Invitation({
        token: "token-asdf",
        expiresAt: addDays(new Date(), 2),
      }),
    ];
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      passwordResets: [],
      invitations: invitations.slice(),
      status: UserStatus.Active,
    };
    const user = new User({ ...props });

    const token = user.reinvite();
    expect(token).toBeToken(24);
    expect(user).toEqual(
      new User({
        ...props,
        invitations: [
          ...invitations,
          new Invitation({
            token: expect.toBeToken(24),
            expiresAt: expect.toBeDaysIntoFuture(7),
          }),
        ],
      }),
    );
  });
});

describe("acceptInvite", () => {
  test("throws error if invite does not exist", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const result = user.acceptInvite({
      token: "asdf",
      firstName: "First",
      lastName: "Last",
      password: "pa$$word",
    });
    await expect(result).rejects.toThrow(new InvalidInvitationTokenError());

    expect(user).toEqual(new User(props));
  });

  test("throws error if invite is expired", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      passwordResets: [],
      invitations: [
        new Invitation({
          token: "token-asdf",
          expiresAt: addDays(new Date(), -1),
        }),
      ],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const result = user.acceptInvite({
      token: props.invitations[0].token,
      firstName: "First",
      lastName: "Last",
      password: "pa$$word",
    });
    await expect(result).rejects.toThrow(new InvalidInvitationTokenError());

    expect(user).toEqual(new User(props));
  });

  test("converts user to an active user", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Unverified,
      }),
      passwordResets: [],
      invitations: [
        new Invitation({
          token: "token-asdf",
          expiresAt: addDays(new Date(), 1),
        }),
      ],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const request = {
      token: props.invitations[0].token,
      firstName: "First",
      lastName: "Last",
      password: "pa$$word",
    };
    await user.acceptInvite(request);

    expect(user).toEqual(
      new User({
        ...props,
        name: `${request.firstName} ${request.lastName}`,
        password: new Password({ hash: expect.any(String) }),
        email: new UserEmail({
          address: user.email.address,
          status: EmailStatus.Verified,
        }),
        invitations: [],
      }),
    );
  });
});

describe("startPasswordReset", () => {
  test("throws error if user is disabled", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Disabled,
    };
    const user = new User({ ...props });
    expect(() => user.startPasswordReset()).toThrow(new UserDisabledError());
    expect(user).toEqual(new User(props));
  });

  test("returns token with new reset", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const reset = user.startPasswordReset();
    expect(reset).toEqual(
      new PasswordReset({
        token: expect.toBeToken(24),
        expiresAt: expect.toBeHoursIntoFuture(1),
      }),
    );

    expect(user).toEqual(new User(props));
  });
});

describe("completePasswordReset", () => {
  test("throws error if no reset matches token", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    await expect(
      user.completePasswordReset("asdf", "pa$$word"),
    ).rejects.toThrow(new InvalidPasswordResetToken());
  });

  test("updates password if reset token matches", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [PasswordReset.generate(), PasswordReset.generate()],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const newPassword = "pa$$word";
    await user.completePasswordReset(
      props.passwordResets[0].token,
      newPassword,
    );
    expect(user).toEqual(
      new User({
        ...props,
        password: new Password({
          hash: expect.any(String),
        }),
        passwordResets: [],
        invitations: [],
      }),
    );
    await expect(
      scrypt.verify(user.password!.hash, newPassword),
    ).resolves.toEqual(true);
  });
});

describe("startEmailChange", () => {
  test("throws error if user is disabled", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Disabled,
    };
    const user = new User({ ...props });
    const newAddress = "new@example.com";
    expect(() => user.startEmailChange(newAddress)).toThrow(
      new UserDisabledError(),
    );
    expect(user).toEqual(new User(props));
  });

  test("sets up pending verification", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    const newAddress = "new@example.com";
    const verification = user.startEmailChange(newAddress);
    expect(verification).toStrictEqual(user.emailVerification);
    expect(user).toEqual(
      new User({
        ...props,
        emailVerification: new EmailVerification({
          email: newAddress,
          token: expect.toBeToken(24),
          expiresAt: expect.toBeDaysIntoFuture(7),
        }),
      }),
    );
  });
});

describe("confirmEmailChange", () => {
  test("completes email change", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    user.confirmEmailChange(props.emailVerification.token);
    expect(user).toEqual(
      new User({
        ...props,
        email: new UserEmail({
          address: props.emailVerification.email,
          status: EmailStatus.Verified,
        }),
        emailVerification: undefined,
      }),
    );
  });

  test("throws error if no pending verification", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    expect(() => user.confirmEmailChange("asdf")).toThrow();
  });

  test("returns undefined if token does not match", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    expect(() => user.confirmEmailChange("garbage")).toThrow();
  });

  test("returns undefined if token is expired", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), -1),
      }),
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    expect(() =>
      user.confirmEmailChange(props.emailVerification.token),
    ).toThrow();
  });
});

describe("rejectEmail", () => {
  test("updates email to new status", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      invitations: [],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    user.rejectEmail(EmailStatus.Complained);
    expect(user).toEqual(
      new User({
        ...props,
        email: new UserEmail({
          address: props.email.address,
          status: EmailStatus.Complained,
        }),
      }),
    );
  });
});

describe("disable", () => {
  test("disables active user and clears out related data", () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: new Password({ hash: "password-hash" }),
      passwordResets: [PasswordReset.generate()],
      invitations: [],
      emailVerification: EmailVerification.createForEmail(
        "changed@example.com",
      ),
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    user.disable();
    expect(user).toEqual(
      new User({
        ...props,
        password: undefined,
        passwordResets: [],
        emailVerification: undefined,
        status: UserStatus.Disabled,
      }),
    );
  });

  test("disables invited user and clears out related data", () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      passwordResets: [],
      invitations: [Invitation.generate()],
      status: UserStatus.Active,
    };
    const user = new User({ ...props });
    user.disable();
    expect(user).toEqual(
      new User({
        ...props,
        invitations: [],
        status: UserStatus.Disabled,
      }),
    );
  });
});
