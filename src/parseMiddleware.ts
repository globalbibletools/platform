import {
  createMiddleware,
  FunctionMiddlewareWithTypes,
} from "@tanstack/react-start";
import { ZodSchema } from "zod";
import { parseForm } from "./form-parser";

export type ParseMiddleware<Parsed> = FunctionMiddlewareWithTypes<
  {},
  unknown,
  (data: unknown) => Parsed,
  undefined,
  undefined,
  undefined,
  undefined
>;

export function createParseMiddleware<Parsed>(
  schema: ZodSchema<Parsed, any, unknown>,
): ParseMiddleware<Parsed> {
  return createMiddleware({ type: "function" }).inputValidator(
    (data: unknown) => {
      if (data instanceof FormData) {
        return schema.parse(parseForm(data));
      }

      return schema.parse(data);
    },
  );
}
