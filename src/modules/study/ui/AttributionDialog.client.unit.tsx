import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { IntlProvider } from "use-intl";
import enMessages from "../../../messages/en.json";
import AttributionDialog from "./AttributionDialog";
import { ComponentProps } from "react";

const dialogMocks = {
  showModal: vi.fn(),
  close: vi.fn(),
};

vi.mock("@/components/Icon", () => ({
  Icon: () => <span data-testid="mock-icon" />,
}));

describe("AttributionDialog", () => {
  beforeEach(() => {
    dialogMocks.showModal.mockReset();
    dialogMocks.close.mockReset();

    dialogMocks.showModal.mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    dialogMocks.close.mockImplementation(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });

    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: dialogMocks.showModal,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: dialogMocks.close,
    });
  });

  test("opens the dialog when the open button is clicked", () => {
    renderAttributionDialog({
      isOT: false,
      language: { code: "eng", englishName: "English" },
    });

    openDialog();

    expect(dialogMocks.showModal).toHaveBeenCalledTimes(1);
  });

  test("closes the dialog when the close button is clicked", () => {
    renderAttributionDialog({
      isOT: false,
      language: { code: "eng", englishName: "English" },
    });
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(dialogMocks.close).toHaveBeenCalledTimes(1);
  });

  test("renders NT English attributions", () => {
    renderAttributionDialog({
      isOT: false,
      language: { code: "eng", englishName: "English" },
    });
    openDialog();

    expect(snapshotListItems()).toMatchInlineSnapshot(`
      [
        {
          "links": [
            {
              "href": "https://github.com/Center-for-New-Testament-Restoration/SR",
              "text": "Statistical Restoration Greek New Testament",
            },
            {
              "href": "https://greekcntr.org",
              "text": "The Center for New Testament Restoration",
            },
            {
              "href": "https://creativecommons.org/licenses/by/4.0/deed.en",
              "text": "Creative Commons Attribution 4.0 International License",
            },
          ],
          "text": "Statistical Restoration Greek New Testament by Alan Bunning and The Center for New Testament Restoration is used under Creative Commons Attribution 4.0 International License .",
        },
        {
          "links": [
            {
              "href": "https://greekcntr.org/apparatus/index.html",
              "text": "English Glosses",
            },
            {
              "href": "https://greekcntr.org",
              "text": "The Center for New Testament Restoration",
            },
          ],
          "text": "English Glosses by Alan Bunning and The Center for New Testament Restoration are used with permission.",
        },
      ]
    `);
  });

  test("renders NT non-English attributions", () => {
    renderAttributionDialog({
      isOT: false,
      language: { code: "fra", englishName: "French" },
    });
    openDialog();

    expect(snapshotListItems()).toMatchInlineSnapshot(`
      [
        {
          "links": [
            {
              "href": "https://github.com/Center-for-New-Testament-Restoration/SR",
              "text": "Statistical Restoration Greek New Testament",
            },
            {
              "href": "https://greekcntr.org",
              "text": "The Center for New Testament Restoration",
            },
            {
              "href": "https://creativecommons.org/licenses/by/4.0/deed.en",
              "text": "Creative Commons Attribution 4.0 International License",
            },
          ],
          "text": "Statistical Restoration Greek New Testament by Alan Bunning and The Center for New Testament Restoration is used under Creative Commons Attribution 4.0 International License .",
        },
        {
          "links": [
            {
              "href": "https://github.com/globalbibletools/data/tree/main/fra",
              "text": "French Glosses",
            },
            {
              "href": "https://globalbibletools.com",
              "text": "Global Bible Tools",
            },
            {
              "href": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
              "text": "Creative Commons CC0 1.0 Universal",
            },
          ],
          "text": "French Glosses by Global Bible Tools are available under Creative Commons CC0 1.0 Universal .",
        },
      ]
    `);
  });

  test("renders OT attributions", () => {
    renderAttributionDialog({
      isOT: true,
      language: { code: "eng", englishName: "English" },
    });
    openDialog();

    expect(snapshotListItems()).toMatchInlineSnapshot(`
      [
        {
          "links": [
            {
              "href": "https://github.com/globalbibletools/data/tree/main/eng",
              "text": "English Glosses",
            },
            {
              "href": "https://globalbibletools.com",
              "text": "Global Bible Tools",
            },
            {
              "href": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
              "text": "Creative Commons CC0 1.0 Universal",
            },
          ],
          "text": "English Glosses by Global Bible Tools are available under Creative Commons CC0 1.0 Universal .",
        },
      ]
    `);
  });
});

type ListItemSnapshot = {
  text: string;
  links: Array<{ text: string; href: string }>;
};

function renderAttributionDialog(
  props: ComponentProps<typeof AttributionDialog>,
) {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
      <AttributionDialog {...props} />
    </IntlProvider>,
  );
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Data Attributions" }));
}

function snapshotListItems(): ListItemSnapshot[] {
  const dialog = screen.getByRole("dialog");
  const listItems = within(dialog).getAllByRole("listitem");

  return listItems.map((listItem) => ({
    text: listItem.textContent?.replace(/\s+/g, " ").trim() ?? "",
    links: within(listItem)
      .getAllByRole("link")
      .map((link) => ({
        text: link.textContent?.replace(/\s+/g, " ").trim() ?? "",
        href: link.getAttribute("href") ?? "",
      })),
  }));
}
