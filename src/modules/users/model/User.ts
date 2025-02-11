import EmailStatus from "./EmailStatus";
import EmailVerification from "./EmailVerification";
import {
  InvalidEmailVerificationToken,
  InvalidPasswordResetToken,
} from "./errors";
import Password from "./Password";
import PasswordReset from "./PasswordReset";
import UserEmail from "./UserEmail";

export interface UserProps {
  id: string;
  name?: string;
  email: UserEmail;
  password?: Password;
  passwordResets: PasswordReset[];
  emailVerification?: EmailVerification;
}

export default class User {
  constructor(private props: UserProps) {}

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

  updateName(name: string) {
    this.props.name = name;
  }

  updateEmail(email: UserEmail) {
    this.props.email = email;
  }

  updatePassword(pw: Password) {
    this.props.password = pw;
  }

  startPasswordReset(): PasswordReset {
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
}
