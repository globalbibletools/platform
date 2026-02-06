import esbuild from "esbuild";
import { createServer } from "http";
import path from "path";
import url from "url";
import { Worker } from "worker_threads";

const ctx = await esbuild.context({
  entryPoints: ["src/shared/jobs/bin/worker.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: "dist/job-worker-dev.js",
  sourcemap: "inline",
});

await ctx.watch();

console.log("esbuild watching...");

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HANDLER_PATH = url.pathToFileURL(
  path.resolve(__dirname, "./localWorker.js"),
);

const TIMEOUT = 1000 * 60 * 15;

const server = createServer(async (req, res) => {
  try {
    let body = "";
    for await (const chunk of req) body += chunk;

    const worker = new Worker(HANDLER_PATH, {
      workerData: JSON.parse(body),
    });

    const timeout = setTimeout(() => worker.terminate(), TIMEOUT);
    worker.on("exit", () => {
      clearTimeout(timeout);
    });

    res.statusCode = 200;
    res.end("");
  } catch (err) {
    console.error("Lambda error:", err);
    res.statusCode = 500;
    res.end("Lambda execution failed");
  }
});

server.listen(3000, () => {
  console.log("Lambda dev server http://localhost:3000");
});
