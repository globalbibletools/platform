import { randomBytes } from "crypto";
import { addDays } from "date-fns";

const INVITATION_EXPIRES = 7; // days

export interface InvitationProps {
  token: string;
  expiresAt: Date;
}

export default class Invitation {
  constructor(private readonly props: InvitationProps) {}

  get token() {
    return this.props.token;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  validateToken(token: string): boolean {
    return this.props.token === token && this.props.expiresAt > new Date();
  }

  static generate() {
    return new Invitation({
      token: randomBytes(12).toString("hex"),
      expiresAt: addDays(new Date(), INVITATION_EXPIRES),
    });
  }
}
