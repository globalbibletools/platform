import * as z from "zod";
import { ulid } from "../ulid";

export enum JobStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Complete = "complete",
  Failed = "error",
}

export interface RawJob {
  id: string;
  parentJobId?: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  data?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function createJobModel<
  Type extends string,
  Payload,
  Input = Payload,
  Data = void,
>({
  type,
  payloadSchema,
  dataSchema,
}: {
  type: Type;
  payloadSchema: z.ZodType<Payload, z.ZodTypeDef, Input>;
  dataSchema?: z.ZodType<Data>;
}) {
  const resolvedDataSchema =
    dataSchema ?? (z.void() as unknown as z.ZodType<Data>);

  class JobModel {
    static readonly type: Type = type;
    static readonly payloadSchema = payloadSchema;
    static readonly dataSchema = dataSchema;

    static "~types"?: {
      Type: Type;
      Payload: Payload;
      Input: Input;
      Data: Data;
    };

    id: string;
    parentJobId?: string;
    payload: Payload;
    createdAt: Date;
    status: JobStatus;
    data?: Data;
    updatedAt: Date;

    get type() {
      return JobModel.type;
    }

    constructor(params: {
      id: string;
      parentJobId?: string;
      status: JobStatus;
      payload: Payload;
      data?: Data;
      createdAt: Date;
      updatedAt: Date;
    }) {
      this.id = params.id;
      this.parentJobId = params.parentJobId;
      this.status = params.status;
      this.payload = params.payload;
      this.data = params.data;
      this.createdAt = params.createdAt;
      this.updatedAt = params.updatedAt;
    }

    static create(payload: any, options?: { parentJobId?: string }): JobModel {
      const now = new Date();
      return new JobModel({
        id: ulid(),
        parentJobId: options?.parentJobId,
        status: JobStatus.Pending,
        payload: payloadSchema.parse(payload),
        data: undefined as Data | undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    static fromRaw(raw: RawJob): JobModel {
      return new JobModel({
        id: raw.id,
        parentJobId: raw.parentJobId,
        status: raw.status,
        payload: payloadSchema.parse(raw.payload),
        data: raw.data != null ? resolvedDataSchema.parse(raw.data) : undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      });
    }

    start(): void {
      if (this.status !== JobStatus.Pending) {
        throw new Error("Job already started");
      }
      this.status = JobStatus.InProgress;
      this.updatedAt = new Date();
    }

    fail(error?: Error): void {
      if (error) {
        // TODO: track error in job data
      }
      this.status = JobStatus.Failed;
      this.updatedAt = new Date();
    }

    progress(data: Data): void {
      this.data = resolvedDataSchema.parse(data);
      this.updatedAt = new Date();
    }

    complete(data?: Data): void {
      if (data !== undefined) {
        this.data = resolvedDataSchema.parse(data);
      }
      this.status = JobStatus.Complete;
      this.updatedAt = new Date();
    }
  }

  return JobModel;
}
