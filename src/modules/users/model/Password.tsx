import { randomBytes, scrypt } from "node:crypto";

export interface PasswordProps {
  hash: string;
}

export default class Password {
  static N = 16384;
  static r = 16;
  static p = 1;
  static dkLen = 64;

  constructor(private readonly props: PasswordProps) {}

  get hash() {
    return this.props.hash;
  }

  static async create(password: string) {
    return new Password({
      hash: await Password.hash(password),
    });
  }

  async verify(password: string): Promise<boolean> {
    return Password.verify(this.hash, password);
  }

  static async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const key = await this.generateKey(password, salt);
    return `${salt}:${key}`;
  }

  static async verify(hash: string, password: string): Promise<boolean> {
    const [salt, key] = hash.split(":");
    const targetKey = await this.generateKey(password, salt!);
    return targetKey === key;
  }

  static async generateKey(password: string, salt: string): Promise<string> {
    return await new Promise((resolve, reject) => {
      scrypt(
        password.normalize("NFKC"),
        salt,
        Password.dkLen,
        {
          N: Password.N,
          p: Password.p,
          r: Password.r,
          // errors when 128 * N * r > `maxmem` (approximately)
          maxmem: 128 * Password.N * Password.r * 2,
        },
        (err, buff) => {
          if (err) return reject(err);
          return resolve(buff.toString("hex"));
        },
      );
    });
  }
}
