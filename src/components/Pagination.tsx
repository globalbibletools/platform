"use client";

import { useTranslations } from "next-intl";
import Button from "./Button";
import { Icon } from "./Icon";
import TextInput from "./TextInput";
import { useNavigate, useSearch } from "@tanstack/react-router";

export interface PaginationProps {
  className?: string;
  limit: number;
  total: number;
}

export default function Pagination({
  limit,
  total,
  className = "",
}: PaginationProps) {
  const t = useTranslations("Pagination");

  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const page = search.page ?? 1;
  const maxPages = Math.ceil(total / limit);

  function navigateToPage(page: number) {
    navigate({ to: ".", search: (prev) => ({ ...prev, page }) });
  }

  return (
    <nav
      aria-label="pagination"
      className={`flex gap-4 items-center ${className}`}
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => {
          navigateToPage(page - 1);
        }}
      >
        <Icon icon="arrow-left" className="me-2 rtl:hidden" />
        <Icon icon="arrow-right" className="me-2 hidden rtl:inline-block" />
        {t("prev")}
      </Button>
      <form
        className="flex gap-2 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          const pageInput = e.currentTarget.elements.namedItem(
            "page",
          ) as HTMLInputElement;
          if (pageInput.value === page.toString()) return;
          navigateToPage(pageInput.valueAsNumber);
        }}
      >
        <TextInput
          className="w-16"
          type="number"
          name="page"
          defaultValue={page}
        />
        {t("total", { total: maxPages })}
      </form>
      <Button
        variant="secondary"
        disabled={page >= maxPages}
        onClick={() => {
          navigateToPage(page + 1);
        }}
      >
        {t("next")}
        <Icon icon="arrow-right" className="ms-2 rtl:hidden" />
        <Icon icon="arrow-left" className="ms-2 hidden rtl:inline-block" />
      </Button>
    </nav>
  );
}
