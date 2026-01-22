import { expect } from "vitest";
import { differenceInSeconds } from "date-fns";

expect.extend({
  toBeUlid(received: any) {
    const message = () =>
      `${received} is ${this.isNot ? " not" : ""}a valid ulid`;

    if (typeof received !== "string") {
      return { pass: false, message };
    }

    const cleaned = received.replaceAll("-", "");
    return {
      pass: cleaned.length === 32,
      message,
    };
  },
  toBeNow(received: any) {
    const receivedDate = received && new Date(received);
    const actualDifference = differenceInSeconds(receivedDate, new Date());
    return {
      pass: Math.abs(actualDifference) < 15,
      message: () => {
        return `${receivedDate} is ${this.isNot ? " not" : ""}about now`;
      },
    };
  },
  toBeDaysIntoFuture(received: any, days: number) {
    const receivedDate = received && new Date(received);
    const actualDifference = differenceInSeconds(receivedDate, new Date());
    const expectedDifference = 60 * 60 * 24 * days;
    return {
      pass: Math.abs(actualDifference - expectedDifference) < 15,
      message: () => {
        const hours = Math.round(actualDifference / (60 * 60));
        const actualDays = hours / 24;
        return `${receivedDate} is ${actualDays} days into the future, expected ${this.isNot ? " not" : ""} ${days}`;
      },
    };
  },
  toBeHoursIntoFuture(received: any, hours: number) {
    const receivedDate = received && new Date(received);
    const actualDifference = differenceInSeconds(receivedDate, new Date());
    const expectedDifference = 60 * 60 * hours;
    return {
      pass: Math.abs(actualDifference - expectedDifference) < 15,
      message: () => {
        const minutes = Math.round(actualDifference / 60);
        const actualHours = minutes / 60;
        return `${receivedDate} is ${actualHours} hours into the future, expected ${this.isNot ? " not" : ""} ${hours}`;
      },
    };
  },
  toBeToken(received: any, length?: number) {
    return {
      pass:
        typeof received === "string" && (!length || received.length === length),
      message: () =>
        `${received} is${this.isNot ? "" : " not"} a token${length && `of length ${length}`}`,
    };
  },
  async toBeNextjsRedirect(receivedPromise: any, path: string) {
    let received;
    try {
      received = await receivedPromise;
    } catch (error) {
      received = error;
    }

    return {
      pass:
        received?.message === "NEXT_REDIRECT" &&
        received?.digest === `NEXT_REDIRECT;replace;${path};307;`,
      message: () =>
        `${received instanceof Error ? received.stack : JSON.stringify(received)} is${this.isNot ? "" : " not"} a Next.js redirect to ${path}`,
    };
  },
  async toBeNextjsNotFound(receivedPromise: any) {
    let received;
    try {
      received = await receivedPromise;
    } catch (error) {
      received = error;
    }

    return {
      pass: received?.message === "NEXT_NOT_FOUND",
      message: () =>
        `${received instanceof Error ? received.stack : JSON.stringify(received)} is${this.isNot ? "" : " not"} a Next.js not found redirect`,
    };
  },
});
