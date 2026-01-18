// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, MockedFunction } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InterlinearExportPanelClient, {
  PollExportStatusAction,
  RequestExportAction,
} from "./InterlinearExportPanelClient";
import { FormState } from "@/components/Form";
import { JobStatus } from "@/shared/jobs/model";
import React from "react";

vi.mock("@/components/Button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@/components/Icon", () => ({
  __esModule: true,
  Icon: () => null,
}));
vi.mock("@/components/Form", () => {
  const React = require("react") as typeof import("react");
  const FormContext = React.createContext<FormState>({ state: "idle" });
  return {
    __esModule: true,
    default: ({
      action,
      children,
      className,
    }: {
      action: (state: FormState, formData: FormData) => Promise<FormState>;
      children: React.ReactNode;
      className?: string;
    }) => {
      return (
        <form
          className={className}
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            await action({ state: "idle" }, formData);
          }}
        >
          <FormContext.Provider value={{ state: "idle" }}>
            {children}
          </FormContext.Provider>
        </form>
      );
    },
    FormState: {},
    useFormContext: () => ({ state: "idle" }),
  };
});

describe("InterlinearExportPanelClient", () => {
  const requestExport =
    vi.fn<RequestExportAction>() as MockedFunction<RequestExportAction>;
  const pollExportStatus =
    vi.fn<PollExportStatusAction>() as MockedFunction<PollExportStatusAction>;
  const strings = {
    title: "Interlinear PDF Export",
    description: "Generate a PDF interlinear for all books.",
    submit: "Generate PDF",
    queued: "Queued...",
    statusTitle: "Status",
    allBooksLabel: "All books",
    downloadLabel: "Download PDF",
    expiresLabel: "Expires",
    generatingLabel: "Generating PDF…",
    failedLabel: "Export failed. Please try again.",
    missingLabel: "Export not found. Please try again.",
    statusLabels: {
      pending: "Queued",
      "in-progress": "In progress",
      complete: "Complete",
      error: "Failed",
    },
  };

  beforeEach(() => {
    requestExport.mockReset();
    pollExportStatus.mockReset();
  });

  it("uses provided actions and updates status from polling", async () => {
    requestExport.mockResolvedValue({
      state: "success",
      requestIds: [{ id: "req-123", bookId: 1 }],
    });
    pollExportStatus.mockResolvedValue({
      id: "req-123",
      status: JobStatus.Complete,
      bookId: 1,
      downloadUrl: "https://example.com/export.pdf",
      expiresAt: null,
    });

    render(
      <InterlinearExportPanelClient
        languageCode="spa"
        strings={strings}
        requestExport={requestExport}
        pollExportStatus={pollExportStatus}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /generate pdf/i,
    });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(requestExport).toHaveBeenCalledTimes(1);
    const submittedForm = requestExport.mock.calls[0]?.[0] as FormData;
    expect(submittedForm.get("languageCode")).toBe("spa");

    expect(
      await screen.findByText(strings.statusLabels[JobStatus.Complete]),
    ).not.toBeNull();
    expect(screen.getByText(/Download PDF/)).not.toBeNull();
  });
});
