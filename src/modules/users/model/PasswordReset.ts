import { randomBytes } from "crypto";
import { addHours } from "date-fns";

export interface PasswordResetProps {
  token: string;
  expiresAt: Date;
}

const TOKEN_EXPIRES = 1; // hrs

export default class PasswordReset {
  constructor(private readonly props: PasswordResetProps) {}

  get token() {
    return this.props.token;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  checkExpiration(): boolean {
    return this.props.expiresAt > new Date();
  }

  static generate() {
    return new PasswordReset({
      token: randomBytes(12).toString("hex"),
      expiresAt: addHours(new Date(), TOKEN_EXPIRES),
    });
  }
}
