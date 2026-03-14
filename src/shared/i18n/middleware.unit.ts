import { expect, test, vi } from "vitest";

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // TODO: why this error?
    ...actual,
    createMiddleware: ({ type }: { type: string }) => ({
      server: (
        handler: (context: {
          request: Request;
          next: () => Promise<Response>;
        }) => Promise<Response>,
      ) => {
        if (type !== "request") {
          throw new Error("Unexpected middleware type");
        }
        return handler;
      },
    }),
  };
});

import { localeMiddleware } from "./middleware";

const runLocaleMiddleware = localeMiddleware as unknown as (options: {
  request: Request;
  next: () => Promise<Response>;
}) => Promise<Response>;

test("continues for ignored api path", async () => {
  const next = vi.fn(async () => new Response("ok", { status: 200 }));

  const response = await runLocaleMiddleware({
    request: new Request("https://example.com/api/health"),
    next,
  });

  expect(next).toHaveBeenCalledTimes(1);
  expect(response.status).toBe(200);
});

test("redirects to locale-prefixed path when locale is missing", async () => {
  const next = vi.fn(async () => new Response("ok", { status: 200 }));

  const response = await runLocaleMiddleware({
    request: new Request("https://example.com/read/eng/GEN.1.1"),
    next,
  });

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    "https://example.com/en/read/eng/GEN.1.1",
  );
});

test("redirects when locale-prefixed api path is stripped to ignored path", async () => {
  const next = vi.fn(async () => new Response("ok", { status: 200 }));

  const response = await runLocaleMiddleware({
    request: new Request("https://example.com/en/api/health"),
    next,
  });

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    "https://example.com/api/health",
  );
});

test("continues when localized non-ignored path is valid", async () => {
  const next = vi.fn(async () => new Response("ok", { status: 200 }));

  const response = await runLocaleMiddleware({
    request: new Request("https://example.com/en/read/eng/GEN.1.1"),
    next,
  });

  expect(next).toHaveBeenCalledTimes(1);
  expect(response.status).toBe(200);
});
