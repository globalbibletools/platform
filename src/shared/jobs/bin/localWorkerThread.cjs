const { workerData } = require("worker_threads");
const { handler } = require("../../../../dist/job-worker-dev.cjs");

handler(workerData).catch(console.error);
