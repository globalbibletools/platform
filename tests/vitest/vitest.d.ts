import "vitest";

declare module "vitest" {
  interface Assertion<T = any> {
    toBeUlid(): T;
    toBeDaysIntoFuture(days: number): T;
    toBeHoursIntoFuture(hours: number): T;
    toBeToken(length?: number): T;
    toBeTanstackNotFound(): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toBeUlid(): string;
    toBeNow<T extends Date | string>(): T;
    toBeDaysIntoFuture<T extends Date | string>(days: number): T;
    toBeHoursIntoFuture<T extends Date | string>(hours: number): T;
    toBeToken(length?: number): string;
  }
}
