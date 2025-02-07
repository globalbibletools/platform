import { vi } from "vitest";

// Disable logging so the test run isn't so noisy
process.env.LOG_LEVEL = "silent";

// nextjs uses the canary version of react which provides a request cache function
// We have to mock it in tests because tests load react 18.
vi.mock("react", async (importOriginal) => {
  const testCache = <T extends (...args: Array<unknown>) => unknown>(func: T) =>
    func;
  const originalModule = await importOriginal<typeof import("react")>();
  return {
    ...originalModule,
    cache: testCache,
  };
});

// next-intl/server methods don't work outside of a nextjs environment
// this mocks "getTranslations" to operate on the English locale
vi.mock("next-intl/server", async (importOriginal) => {
  const messages = await import("@/messages/en.json");
  const { createTranslator } = await import("next-intl");
  const getTranslations = (namespace: any) => {
    return createTranslator({ messages, namespace, locale: "en" });
  };
  const originalModule =
    await importOriginal<typeof import("next-intl/server")>();
  return {
    ...originalModule,
    getTranslations,
    getLocale: () => Promise.resolve("en"),
  };
});

vi.mock("next/cache", () => {
  return {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  };
});

export const cookies = {
  set: vi.fn(),
  get: vi.fn(),
  reset() {
    this.set.mockReset();
    this.get.mockReset();
  },
};

vi.mock("next/headers", async () => {
  return {
    cookies: () => ({ get: cookies.get, set: cookies.set }),
  };
});
