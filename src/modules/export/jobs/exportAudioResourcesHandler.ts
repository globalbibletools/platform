import { logger } from "@/logging";
import { ExportAudioResourcesJob } from "./ExportAudioResourceJob";

export async function exportAudioResourcesHandler(
  job: ExportAudioResourcesJob,
) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });
}
