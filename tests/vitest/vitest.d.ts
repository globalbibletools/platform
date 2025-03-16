import "vitest";

interface CustomMatchers<R = unknown> {}

declare module "vitest" {
  interface Assertion<T = any> {
    toBeUlid(): T;
    toBeDaysIntoFuture(days: number): T;
    toBeHoursIntoFuture(hours: number): T;
    toBeToken(length?: number): T;
    toBeNextjsRedirect(path: string): Promise<T>;
    toBeNextjsNotFound(): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toBeUlid(): string;
    toBeDaysIntoFuture<T extends Date | string>(days: number): T;
    toBeHoursIntoFuture<T extends Date | string>(hours: number): T;
    toBeToken(length?: number): string;
  }
}
