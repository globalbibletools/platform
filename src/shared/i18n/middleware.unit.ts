import { expect, MockedFunction, test, vi } from "vitest";
import { localeMiddleware } from "./middleware";
import {
  RequestMiddlewareWithTypes,
  RequestServerOptions,
} from "@tanstack/react-start";

type MiddlewareContext<TRegister, TMiddlewares> = RequestServerOptions<
  TRegister,
  TMiddlewares
>["context"];

type MiddlewareHarnessArgs<TRegister, TMiddlewares> = {
  request: Request;
  nextResponse?: Response;
} & (MiddlewareContext<TRegister, TMiddlewares> extends undefined ?
  { context?: MiddlewareContext<TRegister, TMiddlewares> }
: { context: MiddlewareContext<TRegister, TMiddlewares> });

interface MiddlewareHarnessResult<TRegister, TMiddlewares> {
  response: Response | undefined;
  next: MockedFunction<RequestServerOptions<TRegister, TMiddlewares>["next"]>;
}

function createRequestMiddlewareTestHarness<
  TRegister,
  TMiddlewares,
  TServerContext,
>(
  middleware: RequestMiddlewareWithTypes<
    TRegister,
    TMiddlewares,
    TServerContext
  >,
) {
  return async ({
    request,
    nextResponse = new Response("ok", { status: 200 }),
    context,
  }: MiddlewareHarnessArgs<TRegister, TMiddlewares>): Promise<
    MiddlewareHarnessResult<TRegister, TMiddlewares>
  > => {
    const next = vi.fn(({ context }: { context?: TServerContext } = {}) => ({
      request,
      pathname: new URL(request.url).pathname,
      response: nextResponse,
      context,
    })) as MockedFunction<
      RequestServerOptions<TRegister, TMiddlewares>["next"]
    >;

    const response = await middleware.options.server?.({
      next: next as RequestServerOptions<TRegister, TMiddlewares>["next"],
      request,
      pathname: new URL(request.url).pathname,
      context: context as RequestServerOptions<
        TRegister,
        TMiddlewares
      >["context"],
    });

    if (!response) {
      return { response: undefined, next };
    } else if ("response" in response) {
      return { response: response.response, next };
    } else {
      return { response, next };
    }
  };
}

const testMiddleware = createRequestMiddlewareTestHarness(localeMiddleware);

test("continues for ignored api path", async () => {
  const { response, next } = await testMiddleware({
    request: new Request("https://example.com/api/health"),
  });

  expect(next).toHaveBeenCalledExactlyOnceWith();
  expect(response?.status).toBe(200);
});

test("redirects to locale-prefixed path when locale is missing", async () => {
  const { response, next } = await testMiddleware({
    request: new Request("https://example.com/read/eng/GEN.1.1"),
  });

  expect(next).not.toHaveBeenCalled();
  expect(response?.status).toBe(307);
  expect(response?.headers.get("location")).toBe(
    "https://example.com/en/read/eng/GEN.1.1",
  );
});

test("redirects when locale-prefixed api path is stripped to ignored path", async () => {
  const { response, next } = await testMiddleware({
    request: new Request("https://example.com/en/api/health"),
  });

  expect(next).not.toHaveBeenCalled();
  expect(response?.status).toBe(307);
  expect(response?.headers.get("location")).toBe(
    "https://example.com/api/health",
  );
});

test("continues when localized non-ignored path is valid", async () => {
  const { response, next } = await testMiddleware({
    request: new Request("https://example.com/en/read/eng/GEN.1.1"),
  });

  expect(next).toHaveBeenCalledExactlyOnceWith();
  expect(response?.status).toBe(200);
});
