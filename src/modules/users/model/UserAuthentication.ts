import { Scrypt } from "oslo/password";
import PasswordReset from "./PasswordReset";

export interface UserAuthenticationProps {
  hashedPassword: string;
  resets: PasswordReset[];
}

const scrypt = new Scrypt();

export default class UserAuthentication {
  constructor(private readonly props: UserAuthenticationProps) {}

  static async createPassword(password: string) {
    return new UserAuthentication({
      hashedPassword: await scrypt.hash(password),
      resets: [],
    });
  }

  get hashedPassword() {
    return this.props.hashedPassword;
  }

  get resets() {
    return this.props.resets;
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

    return UserAuthentication.createPassword(newPassword);
  }
}
