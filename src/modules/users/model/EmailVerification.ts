import { randomBytes } from "crypto";
import { addDays } from "date-fns";

export interface EmailVerificationProps {
  email: string;
  token: string;
  expiresAt: Date;
}

const TOKEN_EXPIRES = 7; // days

export default class EmailVerification {
  constructor(private readonly props: EmailVerificationProps) {}

  get email() {
    return this.props.email;
  }

  get token() {
    return this.props.token;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  checkExpiration(): boolean {
    return this.props.expiresAt > new Date();
  }

  static createForEmail(email: string) {
    return new EmailVerification({
      email,
      token: randomBytes(12).toString("hex"),
      expiresAt: addDays(new Date(), TOKEN_EXPIRES),
    });
  }
}
