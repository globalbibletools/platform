import EmailStatus from "./EmailStatus";
import EmailVerification from "./EmailVerification";

export interface UserEmailProps {
  address: string;
  status: EmailStatus;
  verification?: EmailVerification;
}

export default class UserEmail {
  constructor(private readonly props: UserEmailProps) {}

  get address() {
    return this.props.address;
  }

  get status() {
    return this.props.status;
  }

  get verification() {
    return this.props.verification;
  }

  static createForNewUser(email: string) {
    return new UserEmail({
      address: email,
      status: EmailStatus.Unverified,
    });
  }

  verify() {
    return new UserEmail({
      ...this.props,
      status: EmailStatus.Verified,
    });
  }

  initiateEmailChange(email: string) {
    return new UserEmail({
      ...this.props,
      verification: EmailVerification.createForEmail(email),
    });
  }

  confirmEmailChange(token: string): UserEmail | undefined {
    if (this.props.verification?.token !== token) return;
    return new UserEmail({
      status: EmailStatus.Verified,
      address: this.props.verification.email,
      verification: undefined,
    });
  }

  handleBounce() {
    return new UserEmail({
      ...this.props,
      status: EmailStatus.Bounced,
    });
  }

  handleComplaint() {
    return new UserEmail({
      ...this.props,
      status: EmailStatus.Complained,
    });
  }
}
