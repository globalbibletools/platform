import * as z from "zod";
import { Job } from "./model";

export interface JobDefinition<
  Type extends string = string,
  Payload = unknown,
  Input = Payload,
  Data = undefined,
> {
  readonly type: Type;
  readonly payloadSchema: z.ZodType<Payload, z.ZodTypeDef, Input>;
  readonly dataSchema?: z.ZodType<Data>;
  readonly handler: (job: Job<Type, Payload, Data>) => Promise<void>;
  readonly timeout?: number;
}

export interface ChildJobDefinition<
  Type extends string = string,
  Payload = unknown,
  Input = Payload,
  Data = undefined,
> extends JobDefinition<Type, Payload, Input, Data> {
  readonly isChildJob: true;
}

export const voidPayload: z.ZodVoid = z.void();

export function defineJob<
  Type extends string,
  Payload,
  Input,
  Data = undefined,
>(options: {
  type: Type;
  payloadSchema: z.ZodType<Payload, z.ZodTypeDef, Input>;
  dataSchema?: z.ZodType<Data>;
  handler: (job: Job<Type, Payload, Data>) => Promise<void>;
  timeout?: number;
}): JobDefinition<Type, Payload, Input, Data> {
  return options;
}

export function defineChildJob<
  Type extends string,
  Payload,
  Input,
  Data = undefined,
>(options: {
  type: Type;
  payloadSchema: z.ZodType<Payload, z.ZodTypeDef, Input>;
  dataSchema?: z.ZodType<Data>;
  handler: (job: Job<Type, Payload, Data>) => Promise<void>;
  timeout?: number;
}): ChildJobDefinition<Type, Payload, Input, Data> {
  return { ...options, isChildJob: true };
}
