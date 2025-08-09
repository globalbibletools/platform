import EmailStatus from "./EmailStatus";
import EmailVerification from "./EmailVerification";
import {
  InvalidEmailVerificationToken,
  InvalidInvitationTokenError,
  InvalidPasswordResetToken,
  UserAlreadyActiveError,
  UserDisabledError,
  UserPendingInviteError,
} from "./errors";
import Invitation from "./Invitation";
import Password from "./Password";
import PasswordReset from "./PasswordReset";
import UserEmail from "./UserEmail";
import { ulid } from "@/shared/ulid";
import UserStatus from "./UserStatus";
import SystemRole from "./SystemRole";

export interface UserProps {
  id: string;
  name?: string;
  email: UserEmail;
  password?: Password;
  passwordResets: PasswordReset[];
  emailVerification?: EmailVerification;
  invitations: Invitation[];
  status: UserStatus;
  systemRoles: SystemRole[];
}

export interface AcceptInviteOptions {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

export default class User {
  constructor(private props: UserProps) {}

  static invite(email: string): { user: User; token: string } {
    const invite = Invitation.generate();
    const user = new User({
      id: ulid(),
      email: UserEmail.createForNewUser(email),
      invitations: [invite],
      passwordResets: [],
      status: UserStatus.Active,
      systemRoles: [],
    });

    return { user, token: invite.token };
  }

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get emailVerification() {
    return this.props.emailVerification;
  }

  get password() {
    return this.props.password;
  }

  get passwordResets() {
    return this.props.passwordResets;
  }

  get invitations() {
    return this.props.invitations;
  }

  get status() {
    return this.props.status;
  }

  get systemRoles() {
    return this.props.systemRoles;
  }

  updateName(name: string) {
    this.props.name = name;
  }

  updatePassword(pw: Password) {
    this.props.password = pw;
  }

  reinvite(): string {
    if (this.props.password) throw new UserAlreadyActiveError();

    const invite = Invitation.generate();
    this.props.invitations.push(invite);
    this.props.status = UserStatus.Active;
    return invite.token;
  }

  async acceptInvite(options: AcceptInviteOptions): Promise<void> {
    if (
      !this.props.invitations.some((invite) =>
        invite.validateToken(options.token),
      )
    ) {
      throw new InvalidInvitationTokenError();
    }

    this.props.name = `${options.firstName} ${options.lastName}`;
    this.props.password = await Password.create(options.password);
    this.props.invitations = [];
    this.props.email = this.props.email.updateStatus(EmailStatus.Verified);
  }

  startPasswordReset(): PasswordReset {
    if (this.props.status === UserStatus.Disabled)
      throw new UserDisabledError();
    if (!this.props.password) throw new UserPendingInviteError();

    const reset = PasswordReset.generate();
    this.props.passwordResets.push(reset);
    return reset;
  }

  async completePasswordReset(token: string, newPassword: string) {
    if (
      !this.props.passwordResets.some((reset) => reset.validateToken(token))
    ) {
      throw new InvalidPasswordResetToken();
    }

    this.props.password = await Password.create(newPassword);
    this.props.passwordResets = [];
  }

  startEmailChange(email: string): EmailVerification {
    if (this.props.status === UserStatus.Disabled)
      throw new UserDisabledError();

    const verification = EmailVerification.createForEmail(email);
    this.props.emailVerification = verification;
    return verification;
  }

  confirmEmailChange(token: string) {
    if (!this.props.emailVerification?.validateToken(token)) {
      throw new InvalidEmailVerificationToken();
    }

    this.props.email = new UserEmail({
      status: EmailStatus.Verified,
      address: this.props.emailVerification.email,
    });
    this.props.emailVerification = undefined;
  }

  rejectEmail(reason: EmailStatus) {
    this.props.email = this.props.email.updateStatus(reason);
  }

  disable() {
    this.props.status = UserStatus.Disabled;
    this.props.invitations = [];
    this.props.passwordResets = [];
    delete this.props.password;
    delete this.props.emailVerification;
  }

  changeSystemRoles(roles: SystemRole[]) {
    if (this.props.status === UserStatus.Disabled)
      throw new UserDisabledError();

    this.props.systemRoles = roles.slice();
  }
}
