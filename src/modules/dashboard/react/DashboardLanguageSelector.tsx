"use client";

import ComboboxInput from "@/components/ComboboxInput";
import { useRouter } from "next/navigation";

interface Language {
  code: string;
  name: string;
}

export default function DashboardLanguageSelector({
  languages,
  code,
}: {
  languages: Language[];
  code: string;
}) {
  const router = useRouter();

  return (
    <ComboboxInput
      className="w-48"
      value={code}
      items={languages.map((lang) => ({
        label: lang.name,
        value: lang.code,
      }))}
      onChange={(newCode) => {
        document.cookie = `lang=${newCode}; path=/`;
        router.refresh();
      }}
    />
  );
}
