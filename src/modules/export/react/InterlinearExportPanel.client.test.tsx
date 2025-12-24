import { describe, expect, it, vi, beforeEach, MockedFunction } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InterlinearExportPanelClient, {
  PollExportStatusAction,
  RequestExportAction,
} from "./InterlinearExportPanelClient";
import { FormState } from "@/components/Form";
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

vi.mock("@/components/FieldError", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/SortableMultiselectInput", () => ({
  __esModule: true,
  default: ({ name, placeholder }: { name: string; placeholder?: string }) => (
    <input
      aria-label="Books"
      name={name}
      placeholder={placeholder}
      data-testid="book-select"
    />
  ),
}));

describe("InterlinearExportPanelClient", () => {
  const requestExport =
    vi.fn<RequestExportAction>() as MockedFunction<RequestExportAction>;
  const pollExportStatus =
    vi.fn<PollExportStatusAction>() as MockedFunction<PollExportStatusAction>;
  const strings = {
    title: "Interlinear PDF Export",
    description: "Generate a PDF interlinear for selected chapters.",
    booksLabel: "Books",
    booksPlaceholder: "All books (default)",
    booksHelp: "Leave blank to export all books.",
    chaptersLabel: "Chapters (comma-separated or ranges)",
    chaptersPlaceholder: "e.g. 1,2,4-6 (leave blank for all)",
    layoutLabel: "Layout",
    layoutStandard: "Standard (word by word)",
    layoutParallel: "Parallel (Original | Gloss column)",
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
      PENDING: "Queued",
      IN_PROGRESS: "In progress",
      COMPLETE: "Complete",
      FAILED: "Failed",
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
    } as FormState & { requestIds: { id: string; bookId: number }[] });
    pollExportStatus.mockResolvedValue({
      id: "req-123",
      status: "COMPLETE",
      bookId: 1,
      downloadUrl: "https://example.com/export.pdf",
      expiresAt: null,
    });

    render(
      <InterlinearExportPanelClient
        languageCode="spa"
        books={[{ id: 1, name: "Genesis" }]}
        strings={strings}
        requestExport={requestExport}
        pollExportStatus={pollExportStatus}
      />,
    );

    fireEvent.change(screen.getByLabelText(strings.chaptersLabel), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByTestId("book-select"), {
      target: { value: "1" },
    });

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
      await screen.findByText(strings.statusLabels.COMPLETE),
    ).not.toBeNull();
    expect(screen.getByText(/Download PDF/)).not.toBeNull();
  });
});
