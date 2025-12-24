import type exportRequestRepository from "../data-access/ExportRequestRepository";

export default class GetInterlinearExportStatus {
  constructor(
    private readonly deps: {
      exportRequestRepository: typeof exportRequestRepository;
    },
  ) {}

  async execute(requestId: string) {
    return this.deps.exportRequestRepository.findStatus(requestId);
  }
}
