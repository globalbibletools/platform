import { Scrypt } from "oslo/password";
export interface PasswordProps {
  hash: string;
}

const scrypt = new Scrypt();

export default class Password {
  constructor(private readonly props: PasswordProps) {}

  get hash() {
    return this.props.hash;
  }

  static async create(password: string) {
    return new Password({
      hash: await scrypt.hash(password),
    });
  }

  async verify(password: string): Promise<boolean> {
    return await scrypt.verify(this.props.hash, password);
  }
}
