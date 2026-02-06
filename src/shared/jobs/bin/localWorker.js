import { workerData } from "worker_threads";
import { handler } from "../../../../dist/job-worker-dev.js";

await handler(workerData);
