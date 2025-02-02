export enum EmailStatusRaw {
  Verified = "VERIFIED",
  Unverified = "UNVERIFIED",
  Bounced = "BOUNCED",
  Complained = "COMPLAINED",
}

export default class EmailStatus {
  private constructor(readonly value: EmailStatusRaw) {}

  fromRaw(raw: string): EmailStatus {
    switch (raw) {
      case EmailStatusRaw.Verified:
        return EmailStatus.Verified;
      case EmailStatusRaw.Unverified:
        return EmailStatus.Unverified;
      case EmailStatusRaw.Bounced:
        return EmailStatus.Bounced;
      case EmailStatusRaw.Complained:
        return EmailStatus.Complained;
      default:
        throw new Error(`Invalid UserStatus: ${raw}`);
    }
  }

  static Verified = new EmailStatus(EmailStatusRaw.Verified);
  static Unverified = new EmailStatus(EmailStatusRaw.Unverified);
  static Bounced = new EmailStatus(EmailStatusRaw.Bounced);
  static Complained = new EmailStatus(EmailStatusRaw.Complained);
}
