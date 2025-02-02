import { Scrypt } from "oslo/password";
import PasswordReset from "./PasswordReset";

export interface UserAuthenticationProps {
  hashedPassword: string;
  resets: PasswordReset[];
}

const scrypt = new Scrypt();

export default class UserAuthentication {
  constructor(private readonly props: UserAuthenticationProps) {}

  get hashedPassword() {
    return this.props.hashedPassword;
  }

  get resets() {
    return this.props.resets;
  }

  async changePassword(newPassword: string) {
    return new UserAuthentication({
      hashedPassword: await scrypt.hash(newPassword),
      resets: [],
    });
  }

  async verifyPassword(password: string): Promise<boolean> {
    return await scrypt.verify(this.props.hashedPassword, password);
  }

  initiateReset(reset: PasswordReset) {
    return new UserAuthentication({
      ...this.props,
      resets: [...this.props.resets, reset],
    });
  }

  async completeReset(token: string, newPassword: string) {
    if (
      !this.props.resets.some(
        (reset) => reset.token === token && reset.checkExpiration(),
      )
    ) {
      return;
    }

    return this.changePassword(newPassword);
  }
}
