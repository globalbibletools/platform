export class IncorrectPasswordError extends Error {
  constructor() {
    super();
  }
}

export class InvalidPasswordResetToken extends Error {
  constructor() {
    super();
  }
}

export class InvalidEmailVerificationToken extends Error {
  constructor() {
    super();
  }
}

export class InvalidInvitationTokenError extends Error {
  constructor() {
    super();
  }
}

export class EmailAlreadyUsedError extends Error {
  constructor(public email: string) {
    super();
  }
}
