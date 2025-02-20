import EmailStatus from "./EmailStatus";

export interface UserEmailProps {
  address: string;
  status: EmailStatus;
}

export default class UserEmail {
  constructor(private readonly props: UserEmailProps) {}

  get address() {
    return this.props.address;
  }

  get status() {
    return this.props.status;
  }

  static createForNewUser(email: string) {
    return new UserEmail({
      address: email.toLowerCase(),
      status: EmailStatus.Unverified,
    });
  }

  updateStatus(status: EmailStatus) {
    return new UserEmail({
      ...this.props,
      status,
    });
  }
}
