import { Job } from "./job";

export type JobHandler<Payload, Data = unknown> = (
  job: Job<Payload, Data>,
) => Promise<Data>;

const jobMap: Record<string, JobHandler<any>> = {
  export_analytics: async (job: Job<void>) => {
    console.log(job);
  },
};

export default jobMap;
