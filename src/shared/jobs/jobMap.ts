import { Job } from "./job";

export type JobHandler<Payload, Data = unknown> = (
  job: Job<Payload, Data>,
) => Promise<Data>;

type JobMapEntry<Payload, Data = unknown> =
  | {
      handler: JobHandler<Payload, Data>;
      timeout?: number;
    }
  | JobHandler<Payload, Data>;

const jobMap: Record<string, JobMapEntry<any>> = {
  export_analytics: {
    handler: async (job: Job<void>) => {
      console.log(job);
    },
    timeout: 60 * 5, // 5 minutes
  },
};

export default jobMap;
